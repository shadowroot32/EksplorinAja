# Experimental media worker

EksplorinAja's optional self-hosted media worker generates Indonesian speech with Piper and MP3/MP4 output with FFmpeg. It is separate from Next.js so the web process does not need Python, ONNX Runtime, or FFmpeg installed.

## Requirements

- Docker Compose and enough RAM/CPU for a CPU-based neural TTS model.
- A Piper-compatible Indonesian voice model and its .onnx.json config. The sample voice is id_ID-news_tts-medium; review the voice's model card/license before deploying.
- Configure a long random MEDIA_WORKER_TOKEN in both the worker and Next.js environment. Never expose this token to the browser.

## Start the worker

1. Download the Indonesian Piper voice model and matching .onnx.json file from the official Piper voice collection/model card and put both in media-worker/models/. Do not commit model weights.
2. Copy media-worker/.env.example to media-worker/.env and set a strong token.
3. Create a private Docker network once: docker network create eksplorinaja-private (or set MEDIA_PRIVATE_NETWORK to the existing network that the Next.js container uses).
4. Run docker compose -f media-worker/compose.yml up --build -d.
5. Set MEDIA_WORKER_URL to the private URL reachable by Next.js and the same MEDIA_WORKER_TOKEN in the Next.js server environment, then restart/redeploy the app.

The worker must only be reachable from the application/private network. Do not publish port 8090 to the public internet.

## API

- POST /v1/audio with JSON {"text":"...","format":"mp3"} returns audio/mpeg.
- POST /v1/video with JSON {"text":"...","title":"..."} returns video/mp4.
- Both require Authorization: Bearer <MEDIA_WORKER_TOKEN>.
- GET /health reports process readiness only; it does not prove a model is installed.

The first run requires the model files to be mounted. Media generation is synchronous and CPU-heavy; start with short scripts and tune timeouts/resources after measuring on the target host. No user plan, billing, external paid TTS API, or per-user feature quota is introduced. Abuse protection still belongs at the application/network layer.

## Limitations of this prototype

This is a practical first test, not NotebookLM parity: Piper's Indonesian voice is single-speaker narration, not natural multi-host conversational synthesis. MP4 is a narrated sequence of readable title/text cards, not a fully illustrated AI video. The worker does not persist output files; the application streams downloads to the authenticated owner. Verify voice quality, license, CPU/RAM use, and deployment reachability before enabling for everyone.
