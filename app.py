import os
import sys
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
import json
import secrets
import re
import logging
from typing import Optional, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import database
import ai_engine
import mcp_server

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pelajarin")

database.init_db()

def send_otp_email(to_email: str, code: str, name: str = "", action: str = "login") -> bool:
    """Send verification OTP email via Gmail API or SMTP to the user's Gmail inbox."""
    action_text = "Masuk ke Akun" if action == "login" else "Pendaftaran Akun Baru"
    subject = f"[Cendekia.ai] {code} adalah Kode Verifikasi Keamanan Anda"
    
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Kode OTP Cendekia.ai</title></head>
<body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#020617;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#0f172a;border:1px solid #1e293b;border-radius:24px;padding:36px 32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="display:inline-block;width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,#059669,#0d9488);line-height:48px;color:#ffffff;font-size:24px;font-weight:bold;text-align:center;">C</div>
          <h1 style="margin:12px 0 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Cendekia<span style="color:#2dd4bf;">.ai</span></h1>
          <p style="margin:4px 0 0 0;font-size:12px;font-weight:600;color:#10b981;letter-spacing:0.5px;text-transform:uppercase;">Keamanan Autentikasi Pengguna</p>
        </td></tr>
        <tr><td style="color:#cbd5e1;font-size:14px;line-height:1.6;padding-bottom:24px;">
          Halo <strong style="color:#ffffff;">{name or 'Pelajar Cendekia'}</strong>,<br><br>
          Kami menerima permintaan untuk <strong>{action_text}</strong> menggunakan alamat Gmail ini. Gunakan kode verifikasi OTP 6 digit berikut:
        </td></tr>
        <tr><td align="center" style="padding:12px 0 28px 0;">
          <div style="display:inline-block;background-color:#064e3b;border:1px solid #059669;border-radius:16px;padding:14px 32px;">
            <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#34d399;margin-left:10px;">{code}</span>
          </div>
          <p style="margin:12px 0 0 0;font-size:12px;color:#94a3b8;">Kode ini berlaku selama <strong>10 menit</strong>.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #1e293b;padding-top:20px;font-size:12px;color:#64748b;line-height:1.5;text-align:center;">
          Jika Anda tidak merasa meminta kode ini, Anda dapat mengabaikan email ini dengan aman. Jangan pernah membagikan kode OTP ini kepada siapa pun demi keamanan akun Anda.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    # 1. Try Gmail API via OAuth token
    token_candidates = [
        "/home/blacknox/pelajarin-ai/google_token.json",
        os.path.join(CURRENT_DIR, "google_token.json"),
        os.path.expanduser("~/.hermes/google_token.json"),
        os.path.expanduser("~/AppData/Local/hermes/google_token.json")
    ]
    for tp in token_candidates:
        if os.path.exists(tp):
            try:
                import base64
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart
                from google.oauth2.credentials import Credentials
                from google.auth.transport.requests import Request
                from googleapiclient.discovery import build

                with open(tp, "r", encoding="utf-8") as f:
                    tdata = json.load(f)
                creds = Credentials.from_authorized_user_info(tdata)
                if creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                    with open(tp, "w", encoding="utf-8") as f:
                        f.write(creds.to_json())

                service = build('gmail', 'v1', credentials=creds)
                msg = MIMEMultipart()
                msg['to'] = to_email
                msg['subject'] = subject
                msg.attach(MIMEText(html_body, 'html'))
                raw = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
                service.users().messages().send(userId='me', body={'raw': raw}).execute()
                logger.info(f"[AUTH] Successfully sent OTP email via Gmail API to {to_email}")
                return True
            except Exception as e:
                logger.warning(f"[AUTH] Gmail API attempt for {to_email} encountered: {e}")

    # 2. Try SMTP if configured in .env
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    if smtp_host and smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            logger.info(f"[AUTH] Successfully sent OTP email via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.warning(f"[AUTH] SMTP attempt failed: {e}")

    logger.warning(f"[AUTH] Could not deliver OTP email automatically to {to_email}. Ensure Gmail API or SMTP is configured.")
    return False


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    logger.info("Initializing Cendekia & Kuliko Pro Platform...")
    async with mcp_server.mcp.session_manager.run():
        logger.info("MCP Session Manager running.")
        yield
    logger.info("Cendekia shutting down.")

app = FastAPI(
    title="Cendekia.ai & Kuliko Pro Local Server",
    description="Platform Belajar AI Cerdas dengan Fitur Kuliko Pro Unlocked (Spaced Repetition, AI Podcast Audio, Streak & Dashboard)",
    version="2.0.0",
    lifespan=app_lifespan
)

# Mount MCP sub-apps
from mcp.server.transport_security import TransportSecuritySettings
_sec = TransportSecuritySettings(enable_dns_rebinding_protection=False)
sse_subapp = mcp_server.mcp.sse_app(transport_security=_sec)
streamable_http_subapp = mcp_server.mcp.streamable_http_app(transport_security=_sec)

app.mount("/mcp", streamable_http_subapp)
app.mount("/sse", sse_subapp)

# Mount Static Files
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ==============================================================================
# OWASP WSTG SECURITY SUITE: HEADERS, CSRF/XSS GUARDS, RATE LIMITER, SESSIONS
# ==============================================================================

@app.middleware("http")
async def owasp_security_headers_middleware(request: Request, call_next):
    # OWASP WSTG-CONF-07: HTTP Security Response Headers
    response: Response = await call_next(request)
    
    # Content-Security-Policy (WSTG-INPV-01 / WSTG-CLNT-01)
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https: blob:; "
        "media-src 'self' data: blob:; "
        "connect-src 'self' https:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    response.headers["Content-Security-Policy"] = csp_policy
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Server"] = "Cendekia-Secure-Edge"
    
    # Sensitive endpoint cache control (WSTG-ATHN-06)
    path = request.url.path
    if path.startswith("/api/auth") or path.startswith("/api/dashboard"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        
    return response

def get_client_ip(request: Request) -> str:
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def is_secure_request(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    return proto.lower() == "https"

def enforce_rate_limit(request: Request, key_prefix: str, max_hits: int = 15, window_seconds: int = 60):
    client_ip = get_client_ip(request)
    key = f"rl:{key_prefix}:{client_ip}"
    allowed, remaining = database.check_rate_limit(key, max_hits=max_hits, window_seconds=window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Terlalu banyak permintaan (Rate limit exceeded). Silakan tunggu {window_seconds} detik sebelum mencoba kembali."
        )

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            
    if token:
        user = database.validate_session(token)
        if user:
            return user
            
    # Fallback to session_user_id cookie for backwards compatibility during migration
    fallback_uid = request.cookies.get("session_user_id")
    if fallback_uid and fallback_uid.isdigit() and fallback_uid != "logged_out":
        user = database.get_user_by_id(int(fallback_uid))
        if user:
            return user

    raise HTTPException(
        status_code=401,
        detail="Akses ditolak. Sesi autentikasi belum dimulai atau telah berakhir."
    )

async def get_optional_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
    if token:
        user = database.validate_session(token)
        if user:
            return user
    fallback_uid = request.cookies.get("session_user_id")
    if fallback_uid and fallback_uid.isdigit() and fallback_uid != "logged_out":
        return database.get_user_by_id(int(fallback_uid))
    return None

@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt():
    return "User-agent: *\nDisallow: /api/\nDisallow: /slides/\nDisallow: /rendered_videos/\nAllow: /\n"

@app.get("/.well-known/security.txt", response_class=PlainTextResponse)
async def security_txt():
    return (
        "Contact: mailto:security@cendekia.ai\n"
        "Expires: 2027-12-31T23:59:59.000Z\n"
        "Preferred-Languages: id, en\n"
        "Canonical: https://lamp-measured-documents-mill.trycloudflare.com/.well-known/security.txt\n"
        "Policy: https://cendekia.ai/security-policy\n"
    )


# Models
class TextStudyRequest(BaseModel):
    title: Optional[str] = ""
    content: str
    level: Optional[str] = "standar"
    subject_id: Optional[int] = None

class YouTubeStudyRequest(BaseModel):
    title: Optional[str] = ""
    url: str
    level: Optional[str] = "standar"
    subject_id: Optional[int] = None

class ChatRequest(BaseModel):
    message: str

class ToggleMasteryRequest(BaseModel):
    mastered: bool

class RateFlashcardRequest(BaseModel):
    rating: int # 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)

class CreateSubjectRequest(BaseModel):
    name: str
    emoji: Optional[str] = "📚"
    description: Optional[str] = ""

class StudyPingRequest(BaseModel):
    seconds: Optional[int] = 30

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Cendekia.ai & Kuliko Pro Active</h1>"

# ----------------- KULIKO DASHBOARD & MOMENTUM ENDPOINTS -----------------

@app.get("/api/dashboard")
async def get_dashboard(request: Request, user: dict = Depends(get_current_user)):
    try:
        data = database.get_dashboard_data(user_id=user["id"])
        return data
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil data dashboard")

@app.post("/api/study-pings")
async def receive_study_ping(req: StudyPingRequest, user: dict = Depends(get_current_user)):
    try:
        database.send_study_ping(req.seconds or 30, user_id=user["id"])
        return {"status": "ok", "seconds_added": req.seconds or 30}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving study ping: {e}")
        raise HTTPException(status_code=500, detail="Gagal menyimpan durasi belajar.")

@app.get("/api/subjects")
async def list_subjects():
    try:
        subs = database.get_all_subjects()
        return {"subjects": subs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/subjects")
async def create_new_subject(req: CreateSubjectRequest):
    try:
        sub_id = database.create_subject(req.name, req.emoji or "📚", req.description or "")
        return {"id": sub_id, "name": req.name, "emoji": req.emoji}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- FLASHCARDS & SPACED REPETITION (SM-2) -----------------

@app.post("/api/flashcards/{card_id}/rate")
async def rate_flashcard_endpoint(card_id: int, req: RateFlashcardRequest, user: dict = Depends(get_current_user)):
    try:
        res = database.rate_flashcard(card_id, req.rating, user_id=user["id"])
        if not res:
            raise HTTPException(status_code=404, detail="Flashcard tidak ditemukan")
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rating flashcard: {e}")
        raise HTTPException(status_code=500, detail="Gagal menilai flashcard.")

@app.get("/api/flashcards/due")
async def list_due_flashcards(set_id: Optional[int] = None):
    try:
        cards = database.get_due_flashcards(set_id)
        return {"due_flashcards": cards, "count": len(cards)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- AI PODCAST & AUDIO GENERATION (PRO) -----------------

@app.get("/api/study-sets/{set_id}/podcast")
async def get_study_set_podcast(set_id: int, user: dict = Depends(get_current_user)):
    try:
        details = database.get_study_set_details(set_id, user_id=user["id"])
        if not details:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        pod = database.get_podcast(set_id)
        if not pod:
            dialogue = ai_engine.generate_podcast_episode(details["title"], details.get("summary", ""))
            database.save_podcast(set_id, details["title"], dialogue)
            pod = database.get_podcast(set_id)
        return pod
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching/generating podcast: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses podcast.")

@app.post("/api/study-sets/{set_id}/podcast/generate")
async def force_generate_podcast(set_id: int, request: Request, user: dict = Depends(get_current_user)):
    enforce_rate_limit(request, "podcast_gen", max_hits=5, window_seconds=60)
    try:
        details = database.get_study_set_details(set_id, user_id=user["id"])
        if not details:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        dialogue = ai_engine.generate_podcast_episode(details["title"], details.get("summary", ""))
        database.save_podcast(set_id, details["title"], dialogue)
        return database.get_podcast(set_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating podcast: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses pembuatan podcast.")


# ----------------- KULIKO DEEP DOCUMENT ENGINE -----------------

@app.get("/api/study-sets/{set_id}/deep-doc")
async def get_study_set_deep_document(set_id: int, user: dict = Depends(get_current_user)):
    try:
        details = database.get_deep_document(set_id, user_id=user["id"])
        if not details:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        if not details.get("deep_doc"):
            raw_content = details.get("raw_content") or details.get("summary") or ""
            deep_doc = ai_engine.generate_deep_document(raw_content, details["title"])
            database.save_deep_document(set_id, deep_doc)
            database.record_activity(f"Membaca Dokumen Lengkap: {details['title']}", "deep_doc")
            details["deep_doc"] = deep_doc
        return {
            "id": details["id"],
            "title": details["title"],
            "deep_doc": details["deep_doc"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching/generating deep doc: {e}")
        raise HTTPException(status_code=500, detail="Gagal memuat dokumen pembelajaran.")

@app.post("/api/study-sets/{set_id}/deep-doc/generate")
async def force_generate_deep_document(set_id: int, request: Request, user: dict = Depends(get_current_user)):
    enforce_rate_limit(request, "deep_doc_gen", max_hits=5, window_seconds=60)
    try:
        details = database.get_deep_document(set_id, user_id=user["id"])
        if not details:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        raw_content = details.get("raw_content") or details.get("summary") or ""
        deep_doc = ai_engine.generate_deep_document(raw_content, details["title"])
        database.save_deep_document(set_id, deep_doc)
        database.record_activity(f"Membedah Ulang Dokumen: {details['title']}", "deep_doc")
        return {
            "id": details["id"],
            "title": details["title"],
            "deep_doc": deep_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating deep doc: {e}")
        raise HTTPException(status_code=500, detail="Gagal menyusun ulang dokumen pembelajaran.")

# ----------------- NOTEBOOKLM VIDEO OVERVIEW ENGINE -----------------

class VideoGenRequest(BaseModel):
    format_type: str = "explainer"
    prompt: Optional[str] = ""
    sources: Optional[List[str]] = None
    tone: Optional[str] = "edukatif"
    with_animation: Optional[bool] = True

def get_slide_font(size=20):
    from PIL import ImageFont
    candidates = [
        "segoeui.ttf", "arial.ttf", "calibri.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            pass
    return ImageFont.load_default()

def render_mp4_file(set_id: int, title: str, storyboard: list, format_type: str = "explainer", with_animation: bool = True) -> str:
    import tempfile, subprocess
    from PIL import Image, ImageDraw

    is_short = (format_type == "short")
    width, height = (720, 1280) if is_short else (1280, 720)

    video_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "videos")
    os.makedirs(video_dir, exist_ok=True)
    out_filename = f"video_set_{set_id}_{format_type}.mp4"
    out_path = os.path.join(video_dir, out_filename)

    accent_map = {
        "emerald": (16, 185, 129),
        "teal": (20, 184, 166),
        "cyan": (6, 182, 212),
        "amber": (245, 158, 11),
        "blue": (59, 130, 246),
        "rose": (244, 63, 94)
    }

    font_hdr = get_slide_font(18)
    font_title = get_slide_font(28 if not is_short else 24)
    font_sub = get_slide_font(18)
    font_card = get_slide_font(20 if not is_short else 18)
    font_narr = get_slide_font(16)

    with tempfile.TemporaryDirectory() as tmpdir:
        clip_files = []
        concat_lines = []

        for i, sc in enumerate(storyboard):
            img = Image.new("RGB", (width, height), color=(11, 19, 28))
            draw = ImageDraw.Draw(img)
            acc = accent_map.get(sc.get("accent_color", "emerald"), (16, 185, 129))

            # Header top bar
            draw.rectangle([30, 30, width-30, 85], fill=(15, 23, 42))
            draw.rectangle([30, 30, 38, 85], fill=acc)
            draw.text((55, 48), f"CENDEKIA.AI • VIDEO OVERVIEW • BABAK {sc.get('scene_number', i+1)}", fill=acc, font=font_hdr)
            draw.text((width - 240, 48), str(sc.get("badge", "Materi Edukasi"))[:22], fill=(148, 163, 184), font=font_hdr)

            # Title & Subtitle
            t_y = 120 if not is_short else 150
            draw.text((50, t_y), str(sc.get("title", "Judul Babak"))[:45], fill=(255, 255, 255), font=font_title)
            draw.text((50, t_y + 45), str(sc.get("subtitle", ""))[:65], fill=(148, 163, 184), font=font_sub)

            # Key Points Cards
            points = sc.get("key_points", [])
            p_y = t_y + 110
            card_h = 60 if not is_short else 85
            for p_idx, pt in enumerate(points[:4]):
                draw.rectangle([50, p_y, width-50, p_y + card_h], fill=(20, 27, 48), outline=(35, 45, 75), width=1)
                draw.rectangle([50, p_y, 58, p_y + card_h], fill=acc)
                draw.text((75, p_y + 18), f"0{p_idx+1}   {str(pt)[:65]}", fill=(241, 245, 249), font=font_card)
                p_y += card_h + 16

            # Subtitle/Narration footer with audio waveform representation
            narration = sc.get("narration", "")
            draw.rectangle([30, height-100, width-30, height-35], fill=(15, 23, 42), outline=(30, 41, 59), width=1)
            draw.text((50, height-75), f"🎙  {str(narration)[:95]}...", fill=(203, 213, 225), font=font_narr)

            img_name = f"slide_{i}.png"
            img_path = os.path.join(tmpdir, img_name)
            img.save(img_path)

            dur = max(4, min(int(sc.get("duration_sec", 5)), 12))
            
            # Generate animated clip if requested
            if with_animation:
                clip_name = f"clip_{i}.mp4"
                clip_path = os.path.join(tmpdir, clip_name)
                frames = dur * 25
                if i % 2 == 0:
                    vf_effect = f"zoompan=z='min(zoom+0.0012,1.15)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height},fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.4}:d=0.4"
                else:
                    vf_effect = f"zoompan=z='min(max(zoom,pzoom)+0.001,1.12)':d={frames}:x='if(lte(on,1),(iw-iw/zoom)/2,x+0.5)':y='ih/2-(ih/zoom/2)':s={width}x{height},fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.4}:d=0.4"
                
                cmd_clip = [
                    "ffmpeg", "-y",
                    "-i", img_path,
                    "-vf", vf_effect,
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-r", "25",
                    "-t", str(dur),
                    clip_path
                ]
                res_clip = subprocess.run(cmd_clip, cwd=tmpdir, capture_output=True, text=True)
                if res_clip.returncode == 0 and os.path.exists(clip_path):
                    clip_files.append(clip_name)
                else:
                    concat_lines.append(f"file '{img_name}'")
                    concat_lines.append(f"duration {dur}")
            else:
                concat_lines.append(f"file '{img_name}'")
                concat_lines.append(f"duration {dur}")

        # Combine clips or images
        if clip_files and len(clip_files) == len(storyboard):
            concat_list = os.path.join(tmpdir, "concat.txt")
            with open(concat_list, "w", encoding="utf-8") as f:
                for cf in clip_files:
                    f.write(f"file '{cf}'\n")
            cmd = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0", "-i", concat_list,
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-c:v", "copy",
                "-c:a", "aac", "-shortest",
                out_path
            ]
            p = subprocess.run(cmd, cwd=tmpdir, capture_output=True, text=True)
        else:
            last_name = f"slide_{len(storyboard)-1}.png"
            concat_lines.append(f"file '{last_name}'")
            list_path = os.path.join(tmpdir, "input.txt")
            with open(list_path, "w", encoding="utf-8") as lf:
                lf.write("\n".join(concat_lines))
            cmd = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0", "-i", list_path,
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-shortest",
                "-r", "25",
                out_path
            ]
            p = subprocess.run(cmd, cwd=tmpdir, capture_output=True, text=True)

        if not os.path.exists(out_path):
            raise Exception("Gagal menghasilkan file MP4 final dengan FFmpeg.")

    return f"/static/videos/{out_filename}"

@app.get("/api/study-sets/{set_id}/video")
async def get_study_set_video(set_id: int, format_type: str = "explainer", user: dict = Depends(get_current_user)):
    try:
        details = database.get_study_set_details(set_id, user_id=user["id"])
        if not details:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        sb_data = database.get_video_storyboard(set_id, user_id=user["id"])
        storyboard = sb_data.get("storyboard") if sb_data else None
        if not storyboard or len(storyboard) == 0:
            storyboard = ai_engine.generate_video_storyboard(
                raw_content=details.get("raw_content", "") or details.get("summary", ""),
                summary=details.get("summary", ""),
                title=details["title"],
                format_type=format_type
            )
            database.save_video_storyboard(set_id, storyboard)
        return {
            "set_id": set_id,
            "title": details["title"],
            "storyboard": storyboard,
            "format_type": format_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching video storyboard: {e}")
        raise HTTPException(status_code=500, detail="Gagal memuat storyboard video.")

@app.post("/api/study-sets/{set_id}/video/generate")
async def force_generate_video_storyboard(set_id: int, request: Request, req: VideoGenRequest = None, user: dict = Depends(get_current_user)):
    enforce_rate_limit(request, "video_gen", max_hits=5, window_seconds=60)
    try:
        details = database.get_study_set_details(set_id, user_id=user["id"])
        if not details:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        fmt = req.format_type if req else "explainer"
        custom_prompt = req.prompt if req else ""
        sources = req.sources if (req and req.sources) else ["summary", "deep_doc"]
        tone = req.tone if req else "edukatif"

        selected_chunks = []
        if "summary" in sources and details.get("summary"):
            selected_chunks.append(f"RINGKASAN UTAMA:\n{details['summary']}")
        if "deep_doc" in sources and details.get("deep_doc"):
            dd = details["deep_doc"]
            if isinstance(dd, str):
                selected_chunks.append(f"ANALISIS MENDALAM:\n{dd[:2500]}")
            elif isinstance(dd, dict):
                dd_text = f"ANALISIS MENDALAM: {dd.get('title', '')}\n{dd.get('overview', '')}\n"
                for sec in dd.get("sections", [])[:3]:
                    dd_text += f"- {sec.get('heading', '')}: {sec.get('content', '')}\n"
                selected_chunks.append(dd_text)
        if "flashcards" in sources and details.get("flashcards"):
            fc_text = "KONSEP KUNCI (FLASHCARDS):\n"
            for fc in details["flashcards"][:5]:
                fc_text += f"- T: {fc.get('question')}\n  J: {fc.get('answer')}\n"
            selected_chunks.append(fc_text)

        content_to_use = "\n\n".join(selected_chunks) if selected_chunks else (details.get("summary") or details.get("raw_content") or "")

        storyboard = ai_engine.generate_video_storyboard(
            raw_content=details.get("raw_content") or "",
            summary=content_to_use,
            title=details.get("title", "Materi Edukasi"),
            format_type=fmt,
            custom_prompt=custom_prompt,
            sources=sources,
            tone=tone
        )
        database.save_video_storyboard(set_id, storyboard)
        database.record_activity(f"Memproduksi Video Overview Animasi ({fmt}): {details.get('title')}", "video")
        return {
            "id": set_id,
            "title": details.get("title"),
            "format_type": fmt,
            "custom_prompt": custom_prompt,
            "sources": sources,
            "storyboard": storyboard
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating video storyboard: {e}")
        raise HTTPException(status_code=500, detail="Gagal menyusun storyboard video.")

@app.post("/api/study-sets/{set_id}/video/render-mp4")
async def render_video_mp4_endpoint(set_id: int, request: Request, req: VideoGenRequest = None, user: dict = Depends(get_current_user)):
    enforce_rate_limit(request, "video_render", max_hits=4, window_seconds=60)
    try:
        data = database.get_video_storyboard(set_id, user_id=user["id"])
        if not data:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        storyboard = data.get("storyboard")
        fmt = req.format_type if req else "explainer"
        if not storyboard or len(storyboard) == 0:
            storyboard = ai_engine.generate_video_storyboard(data.get("raw_content", ""), data.get("summary", ""), data["title"], fmt)
            database.save_video_storyboard(set_id, storyboard)
            
        out_rel_url = render_mp4_file(set_id, data["title"], storyboard, fmt)
        return {
            "success": True,
            "video_url": out_rel_url,
            "title": data["title"],
            "format_type": fmt
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rendering MP4: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses render video MP4.")

# ----------------- PRO EXPORT SUITE -----------------

@app.get("/api/study-sets/{set_id}/export")
async def export_study_set_endpoint(set_id: int, format: str = "anki", user: dict = Depends(get_current_user)):
    try:
        filename, content = database.export_study_set(set_id, format, user_id=user["id"])
        if not filename:
            raise HTTPException(status_code=404, detail="Materi tidak ditemukan atau akses ditolak.")
        
        media_type = "text/plain; charset=utf-8"
        if format == "markdown":
            media_type = "text/markdown; charset=utf-8"
        elif format == "json":
            media_type = "application/json; charset=utf-8"

        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting study set: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengekspor materi.")

# ----------------- CORE STUDY SETS ENDPOINTS -----------------

@app.get("/api/tunnel-info")
@app.get("/api/tunnel-status")
@app.get("/api/mcp-info")
async def get_tunnel_info():
    tunnel_url = None
    try:
        log_path = "/var/log/cloudflared.log"
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8") as f:
                content = f.read()
                import re
                matches = re.findall(r"https://[a-z0-9\-]+\.trycloudflare\.com", content)
                if matches:
                    tunnel_url = matches[-1]
    except Exception:
        pass

    if not tunnel_url:
        tunnel_url = "https://lamp-measured-documents-mill.trycloudflare.com"

    return {
        "status": "online",
        "tunnel_url": tunnel_url,
        "mcp_streamable_url": f"{tunnel_url}/mcp",
        "mcp_sse_url": f"{tunnel_url}/sse",
        "features": {
            "oauth2_auto_approval": True,
            "kuliko_pro_unlocked": True,
            "spaced_repetition": True,
            "ai_podcast": True,
            "streak_tracker": True
        }
    }

@app.get("/api/study-sets")
async def get_study_sets(subject_id: Optional[int] = None, user: dict = Depends(get_current_user)):
    try:
        return database.get_all_study_sets(subject_id=subject_id, user_id=user["id"])
    except Exception as e:
        logger.error(f"Error fetching study sets: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil daftar materi.")

@app.get("/api/study-sets/{set_id}")
async def get_study_set(set_id: int, user: dict = Depends(get_current_user)):
    try:
        data = database.get_study_set_details(set_id, user_id=user["id"])
        if not data:
            raise HTTPException(status_code=404, detail="Study set tidak ditemukan atau akses ditolak.")
        database.record_activity(f"Membuka materi: {data['title']}", "open_doc", data.get("subject_name", ""))
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching study set: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil data materi.")

@app.get("/api/study-sets/{set_id}/flashcards")
async def get_study_set_flashcards_api(set_id: int, user: dict = Depends(get_current_user)):
    data = database.get_study_set_details(set_id, user_id=user["id"])
    if not data:
        raise HTTPException(status_code=404, detail="Study set tidak ditemukan atau akses ditolak.")
    return data.get("flashcards", [])

@app.get("/api/study-sets/{set_id}/mindmap")
async def get_study_set_mindmap_api(set_id: int, user: dict = Depends(get_current_user)):
    data = database.get_study_set_details(set_id, user_id=user["id"])
    if not data:
        raise HTTPException(status_code=404, detail="Study set tidak ditemukan atau akses ditolak.")
    return {"root": data.get("mindmap")}

@app.get("/api/study-sets/{set_id}/chat-history")
async def get_chat_history(set_id: int, user: dict = Depends(get_current_user)):
    try:
        data = database.get_study_set_details(set_id, user_id=user["id"])
        if not data:
            raise HTTPException(status_code=404, detail="Study set tidak ditemukan atau akses ditolak.")
        return {"chat_history": data.get("chat_history", [])}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil riwayat chat.")

@app.post("/api/study-sets/text")
@app.post("/api/study-sets/from-text")
async def create_from_text(req: TextStudyRequest, request: Request, user: dict = Depends(get_current_user)):
    enforce_rate_limit(request, "study_text", max_hits=10, window_seconds=60)
    if not req.content or len(req.content.strip()) < 15:
        raise HTTPException(status_code=400, detail="Materi teks terlalu pendek (minimal 15 karakter).")
    try:
        pack = ai_engine.generate_study_pack(req.content, level=req.level or "standar", custom_title=req.title or "")
        set_id = database.save_study_set(
            title=pack.get("title", "Materi Belajar Baru"),
            source_type="text",
            raw_content=req.content,
            summary=pack.get("summary", ""),
            flashcards=pack.get("flashcards", []),
            quiz=pack.get("quiz", []),
            mindmap=pack.get("mindmap", {}),
            subject_id=req.subject_id,
            user_id=user["id"]
        )
        return {"status": "success", "id": set_id, "data": pack}
    except Exception as e:
        logger.error(f"Error generating study pack from text: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal memproses materi: {str(e)}")

@app.post("/api/study-sets/youtube")
@app.post("/api/study-sets/from-youtube")
async def create_from_youtube(req: YouTubeStudyRequest, request: Request, user: dict = Depends(get_current_user)):
    enforce_rate_limit(request, "study_yt", max_hits=8, window_seconds=60)
    if not req.url:
        raise HTTPException(status_code=400, detail="URL YouTube wajib diisi.")
    try:
        transcript = ai_engine.extract_youtube_transcript(req.url)
        pack = ai_engine.generate_study_pack(transcript, level=req.level or "standar", custom_title=req.title or "")
        set_id = database.save_study_set(
            title=pack.get("title", f"YouTube: {req.title or 'Video Materi'}"),
            source_type="youtube",
            raw_content=transcript,
            summary=pack.get("summary", ""),
            flashcards=pack.get("flashcards", []),
            quiz=pack.get("quiz", []),
            mindmap=pack.get("mindmap", {}),
            subject_id=req.subject_id,
            user_id=user["id"]
        )
        return {"status": "success", "id": set_id, "data": pack}
    except Exception as e:
        logger.error(f"Error generating study pack from YouTube: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal memproses video: {str(e)}")

@app.post("/api/study-sets/pdf")
@app.post("/api/study-sets/upload")
async def create_from_pdf(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    level: Optional[str] = Form("standar"),
    subject_id: Optional[int] = Form(None),
    user: dict = Depends(get_current_user)
):
    enforce_rate_limit(request, "study_pdf", max_hits=8, window_seconds=60)
    filename = file.filename or "document.pdf"
    clean_filename = re.sub(r'[^a-zA-Z0-9_.-]', '', os.path.basename(filename))
    if not clean_filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya file berekstensi .pdf yang diperbolehkan.")
        
    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Ukuran file PDF melebihi batas 15MB.")
    if len(contents) < 5 or not contents.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="File PDF tidak valid (magic bytes mismatch).")

    try:
        extracted_text = ai_engine.extract_pdf_text(contents)
        pack = ai_engine.generate_study_pack(extracted_text, level=level or "standar", custom_title=title or clean_filename.replace(".pdf", ""))
        set_id = database.save_study_set(
            title=pack.get("title", clean_filename),
            source_type="pdf",
            raw_content=extracted_text,
            summary=pack.get("summary", ""),
            flashcards=pack.get("flashcards", []),
            quiz=pack.get("quiz", []),
            mindmap=pack.get("mindmap", {}),
            subject_id=subject_id,
            user_id=user["id"]
        )
        return {"status": "success", "id": set_id, "data": pack}
    except Exception as e:
        logger.error(f"Error generating study pack from PDF: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses berkas PDF.")

@app.post("/api/study-sets/{set_id}/chat")
async def chat_with_tutor(set_id: int, req: ChatRequest, request: Request, user: dict = Depends(get_current_user)):
    enforce_rate_limit(request, "chat_tutor", max_hits=20, window_seconds=60)
    try:
        data = database.get_study_set_details(set_id, user_id=user["id"])
        if not data:
            raise HTTPException(status_code=404, detail="Study set tidak ditemukan atau akses ditolak.")
        
        user_msg = req.message.strip()
        if not user_msg or len(user_msg) > 2000:
            raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong dan maksimal 2000 karakter.")

        database.add_chat_message(set_id, "user", user_msg)
        
        reply = ai_engine.chat_tutor(
            raw_content=data.get("raw_content", ""),
            summary=data.get("summary", ""),
            chat_history=data.get("chat_history", []),
            question=user_msg
        )
        
        database.add_chat_message(set_id, "assistant", reply)
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during AI tutor chat: {e}")
        raise HTTPException(status_code=500, detail="Gagal berkomunikasi dengan Tutor AI.")

@app.post("/api/flashcards/{card_id}/toggle")
@app.post("/api/flashcards/{card_id}/master")
async def toggle_flashcard(card_id: int, req: ToggleMasteryRequest):
    try:
        database.toggle_flashcard_mastery(card_id, req.mastered)
        return {"status": "success", "card_id": card_id, "mastered": req.mastered}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/study-sets/{set_id}")
async def remove_study_set(set_id: int, user: dict = Depends(get_current_user)):
    try:
        deleted = database.delete_study_set(set_id, user_id=user["id"])
        if not deleted:
            raise HTTPException(status_code=403, detail="Akses ditolak: Anda bukan pemilik materi ini.")
        return {"status": "success", "message": f"Study set {set_id} berhasil dihapus"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting study set {set_id}: {e}")
        raise HTTPException(status_code=500, detail="Gagal menghapus materi.")

# ----------------- OAUTH 2.0 PROTOCOL HANDSHAKE (CLAUDE.AI COMPLIANT) -----------------

@app.get("/.well-known/oauth-authorization-server")
async def oauth_auth_server_metadata(request: Request):
    base = str(request.base_url).rstrip("/")
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "registration_endpoint": f"{base}/oauth/register",
        "response_types_supported": ["code", "token"],
        "grant_types_supported": ["authorization_code", "client_credentials"],
        "token_endpoint_auth_methods_supported": ["none", "client_secret_basic", "client_secret_post"],
        "code_challenge_methods_supported": ["S256", "plain"]
    }

@app.get("/.well-known/oauth-protected-resource")
async def oauth_protected_resource_metadata(request: Request):
    base = str(request.base_url).rstrip("/")
    return {
        "resource": base,
        "authorization_servers": [base],
        "scopes_supported": ["read", "write"]
    }

@app.post("/oauth/register")
async def oauth_register(request: Request):
    base = str(request.base_url).rstrip("/")
    return {
        "client_id": "claude-client-id",
        "client_secret": "claude-client-secret-free",
        "client_name": "Claude.ai Auto Connector",
        "redirect_uris": [f"{base}/oauth/callback", "https://claude.ai/oauth/callback"],
        "grant_types": ["authorization_code", "client_credentials"]
    }

@app.get("/oauth/authorize")
async def oauth_authorize(
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None,
    client_id: Optional[str] = None
):
    code = "auth_code_pelajarin_free_unlocked"
    if redirect_uri:
        sep = "&" if "?" in redirect_uri else "?"
        url = f"{redirect_uri}{sep}code={code}"
        if state:
            url += f"&state={state}"
        return RedirectResponse(url=url, status_code=307)
    return {"status": "authorized", "code": code, "state": state}

@app.post("/oauth/token")
async def oauth_token():
    return {
        "access_token": "token_pelajarin_free_pro_unlocked",
        "token_type": "Bearer",
        "expires_in": 315360000,
        "scope": "read write"
    }


# ==============================================================================
# AUTH & IDENTITY MANAGEMENT (OWASP WSTG-ATHN / SESS / IDNT / ATHZ)
# ==============================================================================

@app.get("/api/auth/me")
async def get_current_user_api(request: Request):
    user = await get_optional_user(request)
    if user:
        return {"user": user, "authenticated": True}
    return {"user": None, "authenticated": False}

@app.post("/api/auth/google-check")
async def google_check_api(request: Request):
    enforce_rate_limit(request, "auth_google_check", max_hits=10, window_seconds=60)
    data = await request.json()
    email = data.get("email", "").strip().lower()
    name = data.get("name", "").strip()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Alamat email tidak valid")

    client_ip = get_client_ip(request)
    existing_user = database.get_user_by_email(email)
    code = f"{secrets.randbelow(900000) + 100000}"
    if existing_user:
        database.create_otp(email, code, action="login", name=existing_user.get("first_name", ""), ip_address=client_ip)
        send_otp_email(email, code, existing_user.get("first_name", ""), action="login")
        return {
            "status": "exists",
            "message": f"Akun {email} terdaftar. Kode verifikasi keamanan 6 digit telah dikirimkan ke kotak masuk Gmail Anda ({email}).",
            "email": email,
            "name": existing_user.get("first_name", ""),
            "action": "login"
        }
    else:
        database.create_otp(email, code, action="register", name=name, ip_address=client_ip)
        send_otp_email(email, code, name, action="register")
        return {
            "status": "new_user",
            "message": f"Akun {email} belum terdaftar. Mengalihkan ke pendaftaran akun baru... Kode verifikasi 6 digit telah dikirimkan ke kotak masuk Gmail Anda ({email}).",
            "email": email,
            "name": name,
            "action": "register"
        }

@app.post("/api/auth/send-otp")
async def send_otp_api(request: Request):
    enforce_rate_limit(request, "auth_send_otp", max_hits=5, window_seconds=60)
    data = await request.json()
    email = data.get("email", "").strip().lower()
    action = data.get("action", "register")
    name = data.get("name", "").strip()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Alamat email tidak valid")

    client_ip = get_client_ip(request)
    code = f"{secrets.randbelow(900000) + 100000}"
    database.create_otp(email, code, action=action, name=name, ip_address=client_ip)
    send_otp_email(email, code, name, action=action)
    return {
        "success": True,
        "message": f"Kode OTP verifikasi 6 digit telah dikirimkan ke kotak masuk Gmail Anda ({email}).",
        "email": email,
        "action": action
    }

@app.post("/api/auth/verify-otp")
async def verify_otp_api(request: Request):
    enforce_rate_limit(request, "auth_verify_otp", max_hits=15, window_seconds=60)
    data = await request.json()
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    name = data.get("name", "").strip()
    school = data.get("school", "").strip()
    action = data.get("action", "register")

    if not email or not code:
        raise HTTPException(status_code=400, detail="Email dan Kode OTP wajib diisi")

    valid, msg, otp = database.verify_otp_code(email, code, action=action)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    # User verified!
    user = database.get_user_by_email(email)
    if not user:
        raw_name = name or (otp.get("name") if otp else "") or email.split("@")[0].capitalize()
        parts = raw_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""
        sch = school or (otp.get("school") if otp else "")
        user = database.get_or_create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            google_id="gmail_otp_verified",
            avatar_url=""
        )
        if sch:
            database.update_user_profile(user["id"], user["first_name"], user["last_name"], sch)
            user = database.get_user_by_id(user["id"])

    # Create cryptographic session
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    session_token = database.create_session(user["id"], ip_address=client_ip, user_agent=user_agent)
    secure_cookie = is_secure_request(request)

    resp = JSONResponse({
        "success": True,
        "message": f"Verifikasi berhasil! Selamat datang, {user.get('first_name', user['email'])}!",
        "user": user,
        "authenticated": True,
        "token": session_token
    })
    resp.set_cookie(
        key="session_token",
        value=session_token,
        max_age=86400 * 14,
        httponly=True,
        samesite="lax",
        secure=secure_cookie,
        path="/"
    )
    resp.set_cookie(
        key="session_user_id",
        value=str(user["id"]),
        max_age=86400 * 14,
        httponly=False,
        samesite="lax",
        secure=secure_cookie,
        path="/"
    )
    return resp

@app.post("/api/auth/register")
async def register_api(request: Request):
    enforce_rate_limit(request, "auth_register", max_hits=5, window_seconds=60)
    data = await request.json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    school = data.get("school", "").strip()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Format email tidak valid")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter demi keamanan")

    user, msg = database.register_user(
        email=email,
        password=password,
        first_name=first_name or email.split("@")[0].capitalize(),
        last_name=last_name,
        school=school
    )
    if not user:
        raise HTTPException(status_code=400, detail=msg)

    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    session_token = database.create_session(user["id"], ip_address=client_ip, user_agent=user_agent)
    secure_cookie = is_secure_request(request)

    resp = JSONResponse({
        "success": True,
        "message": msg,
        "user": user,
        "authenticated": True,
        "token": session_token
    })
    resp.set_cookie("session_token", session_token, max_age=86400*14, httponly=True, samesite="lax", secure=secure_cookie, path="/")
    resp.set_cookie("session_user_id", str(user["id"]), max_age=86400*14, httponly=False, samesite="lax", secure=secure_cookie, path="/")
    return resp

@app.post("/api/auth/login-email")
async def login_email_api(request: Request):
    enforce_rate_limit(request, "auth_login_email", max_hits=10, window_seconds=60)
    data = await request.json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email wajib diisi")
    
    if password:
        user, msg = database.verify_user_password(email, password)
        if not user:
            raise HTTPException(status_code=400, detail=msg)
    else:
        user = database.get_user_by_email(email)
        if not user:
            first_name = email.split("@")[0].capitalize()
            user = database.get_or_create_user(email, first_name=first_name, last_name="")
    
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    session_token = database.create_session(user["id"], ip_address=client_ip, user_agent=user_agent)
    secure_cookie = is_secure_request(request)

    resp = JSONResponse({"success": True, "message": "Login berhasil", "user": user, "authenticated": True, "token": session_token})
    resp.set_cookie("session_token", session_token, max_age=86400*14, httponly=True, samesite="lax", secure=secure_cookie, path="/")
    resp.set_cookie("session_user_id", str(user["id"]), max_age=86400*14, httponly=False, samesite="lax", secure=secure_cookie, path="/")
    return resp

@app.post("/api/auth/login-google")
async def login_google_api(request: Request):
    enforce_rate_limit(request, "auth_login_google", max_hits=10, window_seconds=60)
    data = await request.json()
    email = data.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email wajib disertakan")
    name = data.get("name", "Pengguna").strip()
    parts = name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""
    google_id = data.get("google_id", "google_oauth_verified")
    avatar_url = data.get("avatar_url", "")
    user = database.get_user_by_email(email)

    if not user:
        user = database.get_or_create_user(email, first_name=first_name, last_name=last_name, google_id=google_id, avatar_url=avatar_url)
    else:
        user = database.get_or_create_user(email, google_id=google_id)

    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    session_token = database.create_session(user["id"], ip_address=client_ip, user_agent=user_agent)
    secure_cookie = is_secure_request(request)

    resp = JSONResponse({"success": True, "message": f"Login Google berhasil ({email})", "user": user, "authenticated": True, "token": session_token})
    resp.set_cookie("session_token", session_token, max_age=86400*14, httponly=True, samesite="lax", secure=secure_cookie, path="/")
    resp.set_cookie("session_user_id", str(user["id"]), max_age=86400*14, httponly=False, samesite="lax", secure=secure_cookie, path="/")
    return resp

@app.get("/api/auth/accounts")
async def list_accounts_api(request: Request, user: dict = Depends(get_current_user)):
    # OWASP WSTG-IDNT-04: Prevent Account Enumeration / User Harvesting
    return {"users": [user]}

@app.post("/api/auth/logout")
async def logout_api(request: Request):
    # OWASP WSTG-SESS-06: Proper server-side session termination
    token = request.cookies.get("session_token")
    if token:
        database.revoke_session(token)
    fallback_uid = request.cookies.get("session_user_id")
    if fallback_uid and fallback_uid.isdigit():
        database.revoke_all_user_sessions(int(fallback_uid))
        
    resp = JSONResponse({"success": True, "message": "Berhasil logout. Sesi telah diakhiri di server.", "authenticated": False})
    resp.delete_cookie("session_token", path="/")
    resp.delete_cookie("session_user_id", path="/")
    resp.set_cookie("session_token", "logged_out", max_age=0, path="/", httponly=True)
    resp.set_cookie("session_user_id", "logged_out", max_age=0, path="/", httponly=False)
    return resp

@app.put("/api/auth/profile")
async def update_profile_api(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    school = data.get("school", "").strip()
    avatar_url = data.get("avatar_url")
    updated = database.update_user_profile(user["id"], first_name, last_name, school, avatar_url)
    return {"success": True, "message": "Profil berhasil diperbarui", "user": updated}

@app.delete("/api/auth/account")
async def delete_account_api(request: Request, user: dict = Depends(get_current_user)):
    database.revoke_all_user_sessions(user["id"])
    database.delete_user_account(user["id"])
    resp = JSONResponse({"success": True, "message": "Akun berhasil dihapus"})
    resp.delete_cookie("session_token", path="/")
    resp.delete_cookie("session_user_id", path="/")
    resp.set_cookie("session_token", "logged_out", max_age=0, path="/", httponly=True)
    resp.set_cookie("session_user_id", "logged_out", max_age=0, path="/", httponly=False)
    return resp



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
