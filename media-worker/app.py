import os
import shutil
import subprocess
import tempfile
import textwrap
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from PIL import Image, ImageDraw, ImageFont

app = FastAPI(title="EksplorinAja Media Worker")
TOKEN = os.environ.get("MEDIA_WORKER_TOKEN", "")
MODEL_PATH = Path(os.environ.get("PIPER_MODEL_PATH", "/models/id_ID-news_tts-medium.onnx"))
PIPER_BIN = os.environ.get("PIPER_BIN", "piper")
FFMPEG_BIN = os.environ.get("FFMPEG_BIN", "ffmpeg")
MAX_TEXT_CHARS = int(os.environ.get("MAX_TEXT_CHARS", "12000"))


class AudioRequest(BaseModel):
    text: str = Field(min_length=10, max_length=12000)
    format: str = "mp3"


class VideoRequest(BaseModel):
    text: str = Field(min_length=10, max_length=12000)
    title: str = Field(default="EksplorinAja - Ringkasan Belajar", max_length=160)


def authorize(authorization: str | None) -> None:
    if not TOKEN or authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def require_tools() -> None:
    if not shutil.which(PIPER_BIN) or not shutil.which(FFMPEG_BIN):
        raise HTTPException(status_code=503, detail="Piper or FFmpeg is unavailable")
    if not MODEL_PATH.is_file() or not Path(str(MODEL_PATH) + ".json").is_file():
        raise HTTPException(status_code=503, detail="Indonesian voice model is not installed")


def synthesize(text: str, output: Path) -> None:
    require_tools()
    result = subprocess.run(
        [PIPER_BIN, "--model", str(MODEL_PATH), "--output_file", str(output)],
        input=text.strip(), text=True, capture_output=True, timeout=180, check=False,
    )
    if result.returncode != 0 or not output.is_file() or output.stat().st_size < 1000:
        raise HTTPException(status_code=502, detail="Speech synthesis failed")


def checked_text(text: str) -> str:
    value = text.strip()
    if len(value) > MAX_TEXT_CHARS:
        raise HTTPException(status_code=413, detail="Text is too long for this prototype")
    return value


@app.get("/health")
def health():
    return {"ok": True, "model_installed": MODEL_PATH.is_file() and Path(str(MODEL_PATH) + ".json").is_file()}


@app.post("/v1/audio")
def audio(body: AudioRequest, authorization: str | None = Header(default=None)):
    authorize(authorization)
    if body.format != "mp3":
        raise HTTPException(status_code=400, detail="Only mp3 is supported")
    with tempfile.TemporaryDirectory(prefix="eksplorin-audio-") as temp:
        root = Path(temp)
        wav = root / "speech.wav"
        mp3 = root / "speech.mp3"
        synthesize(checked_text(body.text), wav)
        result = subprocess.run(
            [FFMPEG_BIN, "-nostdin", "-v", "error", "-y", "-i", str(wav),
             "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3)],
            capture_output=True, timeout=180, check=False,
        )
        if result.returncode != 0 or not mp3.is_file():
            raise HTTPException(status_code=502, detail="MP3 encoding failed")
        return Response(mp3.read_bytes(), media_type="audio/mpeg",
                        headers={"Content-Disposition": 'attachment; filename="eksplorinaja-podcast.mp3"',
                                 "Cache-Control": "no-store"})


def load_font(size: int):
    for candidate in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                      "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def render_card(title: str, body: str, output: Path):
    image = Image.new("RGB", (1280, 720), (12, 20, 38))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((48, 48, 1232, 672), radius=32, fill=(22, 34, 58), outline=(111, 76, 220), width=3)
    draw.text((90, 90), "EKSPLORINAJA / STUDY STUDIO", font=load_font(24), fill=(184, 165, 255))
    draw.text((90, 145), title[:90], font=load_font(42), fill=(255, 255, 255))
    y = 235
    for line in textwrap.wrap(body, width=48)[:9]:
        draw.text((92, y), line, font=load_font(27), fill=(224, 231, 242))
        y += 43
    draw.text((90, 620), "Video ringkasan otomatis - EksplorinAja", font=load_font(19), fill=(148, 163, 184))
    image.save(output, format="PNG")


@app.post("/v1/video")
def video(body: VideoRequest, authorization: str | None = Header(default=None)):
    authorize(authorization)
    text = checked_text(body.text)
    paragraphs = [p.strip() for p in text.replace("\r", "").split("\n") if p.strip()]
    chunks = []
    for paragraph in paragraphs:
        if len(paragraph) <= 280:
            chunks.append(paragraph)
        else:
            chunks.extend(paragraph[i:i + 260] for i in range(0, len(paragraph), 260))
    chunks = chunks[:24] or [text[:260]]
    with tempfile.TemporaryDirectory(prefix="eksplorin-video-") as temp:
        root = Path(temp)
        wav, mp3 = root / "speech.wav", root / "speech.mp3"
        synthesize(text, wav)
        encoded = subprocess.run(
            [FFMPEG_BIN, "-nostdin", "-v", "error", "-y", "-i", str(wav),
             "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3)],
            capture_output=True, timeout=180, check=False,
        )
        if encoded.returncode != 0 or not mp3.is_file():
            raise HTTPException(status_code=502, detail="Audio encoding failed")
        cards = []
        for index, chunk in enumerate(chunks):
            path = root / f"slide-{index:03d}.png"
            render_card(body.title if index == 0 else f"Bagian {index + 1}", chunk, path)
            cards.append(path)
        durations = [max(2.5, len(chunk) / max(len(text), 1) * max(len(text) / 14, 8)) for chunk in chunks]
        concat = root / "slides.txt"
        concat.write_text("".join(f"file '{p.as_posix()}'\nduration {d:.3f}\n" for p, d in zip(cards, durations)) +
                          f"file '{cards[-1].as_posix()}'\n", encoding="utf-8")
        mp4 = root / "study.mp4"
        result = subprocess.run(
            [FFMPEG_BIN, "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0",
             "-i", str(concat), "-i", str(mp3), "-vf", "fps=24,format=yuv420p",
             "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-b:a", "128k",
             "-shortest", "-movflags", "+faststart", str(mp4)],
            capture_output=True, timeout=300, check=False,
        )
        if result.returncode != 0 or not mp4.is_file():
            raise HTTPException(status_code=502, detail="MP4 rendering failed")
        return Response(mp4.read_bytes(), media_type="video/mp4",
                        headers={"Content-Disposition": 'attachment; filename="eksplorinaja-study.mp4"',
                                 "Cache-Control": "no-store"})
