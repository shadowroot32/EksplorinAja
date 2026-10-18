import os
import re
import json
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from pypdf import PdfReader
import io

def get_env_config():
    base_url = os.environ.get("LLM_BASE_URL")
    api_key = os.environ.get("LLM_API_KEY") or os.environ.get("HERMES_CUSTOM_LOCALHOST_20128_API_KEY")
    model = os.environ.get("LLM_MODEL", "windows")

    # Check local .env file
    local_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(local_env):
        with open(local_env, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("LLM_BASE_URL="):
                    base_url = line.split("=", 1)[1].strip()
                elif line.startswith("LLM_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                elif line.startswith("LLM_MODEL="):
                    model = line.split("=", 1)[1].strip()

    # Fallback to hermes config if not set
    if not api_key:
        env_file = os.path.expanduser(r"~\AppData\Local\hermes\.env")
        if os.path.exists(env_file):
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("HERMES_CUSTOM_LOCALHOST_20128_API_KEY="):
                        api_key = line.split("=", 1)[1].strip()
                        break

    if not base_url:
        base_url = "http://localhost:20128/v1"

    return base_url.rstrip("/"), api_key or "", model

def call_llm(messages, temperature=0.3, max_tokens=4000):
    base_url, api_key, model = get_env_config()
    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=180)
    if resp.status_code != 200:
        raise Exception(f"LLM API error ({resp.status_code}): {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"]

def extract_youtube_transcript(url: str) -> str:
    pattern = r"(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})"
    match = re.search(pattern, url)
    if not match:
        raise ValueError("URL YouTube tidak valid. Mohon sertakan link video YouTube yang benar.")
    video_id = match.group(1)

    api = YouTubeTranscriptApi()
    try:
        try:
            transcript = api.fetch(video_id, languages=['id', 'en'])
        except Exception:
            t_list = api.list(video_id)
            transcript = t_list.find_transcript(['id', 'en']).fetch()
        
        full_text = " ".join([snippet.text for snippet in transcript.snippets])
        return full_text
    except Exception as e:
        raise RuntimeError(f"Gagal mengekstrak transkrip YouTube: {str(e)}")

def extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text_parts = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_parts.append(f"--- Halaman {i+1} ---\n{text}")
        combined = "\n\n".join(text_parts).strip()
        if not combined:
            raise ValueError("Tidak ada teks yang dapat diekstrak dari PDF (mungkin berupa scan gambar).")
        return combined
    except Exception as e:
        raise RuntimeError(f"Gagal membaca PDF: {str(e)}")

def generate_study_pack(content: str, level: str = "standar", custom_title: str = "") -> dict:
    if len(content) > 35000:
        content = content[:35000] + "\n...[materi dipotong untuk ringkasan optimal]..."

    system_prompt = """Kamu adalah AI Engine dari platform Cendekia.ai (Platform Belajar AI Cerdas untuk Pelajar & Mahasiswa Indonesia).
Tugasmu adalah menganalisis materi belajar yang diberikan dan menghasilkan paket belajar interaktif lengkap 100% berbahasa Indonesia.

Kamu WAJIB mengembalikan HANYA JSON murni (valid JSON) tanpa teks pendahuluan, tanpa markdown block ```json, tanpa penjelasan di luar JSON.

Struktur JSON wajib:
{
  "title": "Judul Materi yang Menarik dan Jelas",
  "summary": "Rangkuman komprehensif dalam format Markdown yang rapi (Gunakan headings, bullet points tebal, tabel jika relevan, analogi simpel, serta bagian 'Konsep Kunci' dan 'Tips Mengingat').",
  "flashcards": [
    {
      "front": "Pertanyaan atau Konsep Kunci (jelas & terfokus)",
      "back": "Jawaban ringkas, padat, dan mudah diingat"
    }
  ],
  "quiz": [
    {
      "question": "Pertanyaan kuis pilihan ganda",
      "options": ["A. Opsi 1", "B. Opsi 2", "C. Opsi 3", "D. Opsi 4"],
      "answer": "A",
      "explanation": "Penjelasan rinci mengapa jawaban tersebut benar dan mengapa opsi lainnya keliru."
    }
  ],
  "mindmap": {
    "name": "Topik Utama",
    "children": [
      {
        "name": "Cabang Konsep 1",
        "children": [
          {"name": "Sub-poin atau Contoh 1.1"},
          {"name": "Sub-poin atau Contoh 1.2"}
        ]
      },
      {
        "name": "Cabang Konsep 2",
        "children": [
          {"name": "Sub-poin atau Contoh 2.1"}
        ]
      }
    ]
  }
}

Ketentuan:
- Hasilkan 6-10 flashcards berkualitas tinggi.
- Hasilkan 4-6 soal kuis interaktif yang menantang pemahaman konsep (bukan sekadar hafalan dangkal).
- Buat mindmap berstruktur hierarki 2-3 tingkat yang representatif.
- Gunakan bahasa yang mudah dipahami, ramah pelajar, namun tetap presisi akademis.
"""

    user_prompt = f"""Materi yang perlu dipelajari:
{content}

Target kedalaman: {level}
Judul kustom (jika ada): {custom_title or 'Auto-detect dari materi'}

Ingat, kembalikan HANYA JSON murni!"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    raw_response = call_llm(messages, temperature=0.3, max_tokens=4000)

    cleaned = raw_response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except Exception as e:
        json_match = re.search(r"(\{[\s\S]*\})", cleaned)
        if json_match:
            data = json.loads(json_match.group(1))
        else:
            raise RuntimeError(f"Gagal mem-parsing output AI menjadi JSON: {str(e)}\nRaw:\n{cleaned[:300]}")

    if custom_title:
        data["title"] = custom_title

    return data

def generate_podcast_episode(title: str, summary: str) -> list:
    system_prompt = """Kamu adalah Produser Podcast Edukasi AI Kuliko & Cendekia Pro.
Tugasmu membuat percakapan santai, asyik, dan mendalam antara dua host AI:
1. Leo (Host Pria): Penasaran, banyak bertanya, suka analogi relatable kehidupan sehari-hari, santai.
2. Maya (Host Wanita): Ahli, tenang, menjelaskan konsep sulit menjadi sangat renyah dan mudah dipahami.

Buat percakapan sepanjang 6-10 putaran dialog yang mencakup inti materi, analogi seru, dan kesimpulan cerdas.
Gunakan bahasa Indonesia semi-santai (bahasa gaul santun edukatif).

Kembalikan HANYA format JSON murni:
[
  {"speaker": "Leo", "text": "..."},
  {"speaker": "Maya", "text": "..."}
]
"""
    user_prompt = f"""Topik Materi: {title}
Inti Ringkasan Materi:
{summary[:3500]}

Buat skrip podcast audio sekarang. Kembalikan HANYA array JSON!"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    raw_response = call_llm(messages, temperature=0.5, max_tokens=2500)
    cleaned = raw_response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        dialogue = json.loads(cleaned)
        if isinstance(dialogue, list):
            return dialogue
    except Exception:
        pass

    # Fallback default dialogue if JSON parsing glitch
    return [
        {"speaker": "Leo", "text": f"Halo kawan-kawan! Selamat datang di Cendekia Podcast. Hari ini kita bakal kupas tuntas tentang {title}."},
        {"speaker": "Maya", "text": f"Hai Leo! Menarik banget topik kali ini, karena {title} punya konsep penting yang wajib kita pahami bersama."},
        {"speaker": "Leo", "text": "Bisa tolong jelaskan Maya, apa poin paling fundamental dari materi ini?"},
        {"speaker": "Maya", "text": f"Intinya ada pada rangkuman materi kita: pemahaman konsep kunci, bagaimana setiap elemen saling terhubung, dan aplikasinya di dunia nyata."},
        {"speaker": "Leo", "text": "Wah jelas banget! Jangan lupa kawan-kawan untuk review flashcards dan selesaikan kuis latihannya ya!"}
    ]

def chat_tutor(raw_content: str, summary: str, chat_history: list, question: str) -> str:
    system_prompt = f"""Kamu adalah 'Tutor AI 24/7' di platform Cendekia.ai.
Kamu bertugas membantu pelajar memahami materi secara interaktif, ramah, jelas, dan menyenangkan.
Jelaskan dengan bahasa Indonesia yang santun, analogi yang mudah dipahami, serta contoh konkret.

Berikut adalah materi acuan utama yang sedang dipelajari pengguna:
--- RINGKASAN MATERI ---
{summary[:4000]}

--- ISI MATERI ASLI (KUTIPAN) ---
{raw_content[:4000]}

Aturan Tutor:
1. Jawab pertanyaan pengguna secara terfokus pada materi di atas.
2. Jika pengguna meminta contoh soal tambahan atau tes pemahaman, buatkan dengan senang hati.
3. Gunakan formatting Markdown tebal, poin, dan rumus bila diperlukan.
4. Jangan bertele-tele; utamakan pemahaman konsep yang kokoh.
"""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history[-6:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("message", "")})
    messages.append({"role": "user", "content": question})

    return call_llm(messages, temperature=0.4, max_tokens=1500)


def generate_deep_document(raw_content: str, title: str) -> str:
    """
    Menghasilkan dokumen pembelajaran mendalam (Deep Document) ala Kuliko
    yang menguraikan seluruh isi materi/PDF secara komprehensif tanpa memotong atau meringkas,
    serta diterjemahkan dan dijelaskan penuh dalam Bahasa Indonesia.
    """
    system_prompt = """Kamu adalah Pakar Analisis & Master Explainer Dokumen Akademik (Deep Document Engine).
Tugasmu adalah menganalisis seluruh isi materi/PDF yang diberikan dan menyusunnya menjadi Dokumen Pembelajaran Lengkap & Sangat Mendalam dalam Bahasa Indonesia.

ATURAN UTAMA (NON-NEGOTIABLE):
1. JANGAN PERNAH MERINGKAS atau memangkas detail materi. Uraikan setiap bab, sub-bab, definisi formal, konsep, hukum/teori, rumus matematis, dan contoh secara menyeluruh tanpa ada yang terlewat.
2. Jelaskan seluruhnya dalam Bahasa Indonesia yang formal, terstruktur rapi, dan mudah dipahami, dengan tetap mempertahankan istilah teknis asli dalam tanda kurung.
3. Buat format Markdown profesional dengan struktur lengkap:
   - # [Judul Dokumen Lengkap]
   - ## Ringkasan Eksekutif & Metadata Analisis (Topik, Bidang Ilmu, Tingkat Kesulitan, Sasaran Pembelajaran)
   - ## Daftar Isi (Table of Contents) dengan link navigasi anchor
   - ## Bab 1: [Judul Bab/Topik] ...
     - ### Konsep Fundamental & Definisi Formal
     - ### Bedah Rinci & Mekanisme Kerja
     - ### Rumus, Formula, atau Logika Matematis (jika ada)
     - > **Catatan Kunci / Istilah Teknis**: Penjelasan terminologi penting.
     - ### Studi Kasus / Contoh Penerapan Praktis
   - ## [Bab-bab selanjutnya secara lengkap tanpa melewatkan satupun bagian]
   - ## Rangkuman Komprehensif & Peta Konseptual
   - ## Glosarium Istilah Akademik

Pastikan isi dokumen sangat detail dan mendalam sehingga pelajar atau profesional dapat memahami 100% isi berkas asli tanpa perlu membuka dokumen aslinya."""

    user_prompt = f"""Judul Dokumen: {title}

Isi Materi Dokumen Sumber (PDF/Teks):
{raw_content[:9000]}

Buat Dokumen Pembelajaran Lengkap (Deep Document) dalam Bahasa Indonesia sekarang sesuai aturan di atas:"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    try:
        deep_doc = call_llm(messages, temperature=0.3, max_tokens=4000)
        return deep_doc.strip()
    except Exception as e:
        return f"# {title}\n\n*Gagal menghasilkan deep document otomatis: {str(e)}*\n\n## Isi Dokumen Asli\n\n{raw_content[:3000]}"


def generate_video_storyboard(raw_content: str, summary: str, title: str, format_type: str = "explainer", custom_prompt: str = "", sources: list = None, tone: str = "edukatif") -> list:
    """
    Menghasilkan storyboard video materi edukasi ala Google NotebookLM Video Overview.
    Mendukung custom prompt, pemilihan sources, tone, dan animasi visual.
    Format: 'explainer' (16:9 Landscape) dan 'short' (9:16 Vertical).
    """
    extra_prompt_instruction = ""
    if custom_prompt and custom_prompt.strip():
        extra_prompt_instruction = f"""
INSTRUKSI KHUSUS PENGGUNA (CUSTOM PROMPT):
"{custom_prompt.strip()}"
Wajib prioritaskan instruksi, analogi, atau penekanan di atas dalam menyusun narasi dan poin babak video!
"""

    tone_instruction = f"Gaya Persona & Narasi: {tone or 'Edukasi Interaktif & Santai'}"

    sources_desc = ""
    if sources and isinstance(sources, list):
        sources_desc = f"Sumber Materi yang Dipilih: {', '.join(sources)}"

    system_prompt = f"""Kamu adalah Produser Video Edukasi AI Senior ala Google NotebookLM Studio.
Tugasmu adalah menyusun storyboard presentasi video visual multi-babak (scenes) yang dinamis, kaya animasi naratif, dan terstruktur rapi.
Format video: {format_type.upper()} ({'16:9 Layar Lebar Landscape' if format_type == 'explainer' else '9:16 Portrait Vertikal TikTok/Reels'}).
{tone_instruction}
{sources_desc}
{extra_prompt_instruction}

ATURAN STRUKTUR BABAK VIDEO:
1. Buat 4 sampai 6 babak visual (scenes) berkesinambungan dengan alur cerita yang hidup.
2. Setiap babak wajib memiliki field berikut dalam format JSON:
   - scene_number: integer (1, 2, 3, ...)
   - badge: label kategori babak (contoh: 'Pendahuluan', 'Konsep Kunci', 'Mekanisme & Alur', 'Studi Kasus', 'Kesimpulan')
   - title: judul visual yang kuat, singkat, dan memikat (maksimal 6 kata)
   - subtitle: penjelasan konteks 1 kalimat singkat
   - narration: naskah narasi audio Bahasa Indonesia yang fasih, hidup, dan edukatif untuk dibacakan oleh pembicara (2-4 kalimat padat)
   - key_points: array berisi 3 poin visual ringkas yang akan dianimasikan secara berurutan (kinetic bullet points)
   - visual_type: 'concept' | 'process' | 'comparison' | 'takeaway'
   - accent_color: 'emerald' | 'teal' | 'cyan' | 'amber' | 'blue'
   - icon: nama icon lucide ('sparkles', 'brain', 'zap', 'target', 'compass', 'award', 'layers', 'activity')
   - duration_sec: durasi estimasi babak (antara 8 sampai 15 detik)
   - animation_effect: 'ken_burns_zoom_in' | 'pan_right' | 'pulse_glow'

Kembalikan HANYA array JSON murni tanpa pembuka/penutup markdown!"""

    user_prompt = f"""Topik Materi: {title}
{extra_prompt_instruction}

Rangkuman & Isi Dokumen Terpilih:
{summary[:2500] if summary else raw_content[:2500]}

Susun storyboard JSON video sekarang:"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    try:
        raw = call_llm(messages, temperature=0.3, max_tokens=3000)
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        storyboard = json.loads(cleaned)
        if isinstance(storyboard, list) and len(storyboard) > 0:
            return storyboard
    except Exception:
        pass

    # Fallback storyboard if parsing fails
    return [
        {
            "scene_number": 1,
            "badge": "Pendahuluan",
            "title": f"Memahami {title}",
            "subtitle": "Pengenalan materi dan landasan konsep",
            "narration": f"Selamat datang dalam video overview materi {title}. Pada pembahasan ini kita akan membedah konsep-konsep paling krusial secara visual dan komprehensif.",
            "key_points": ["Fondasi materi utama", "Tujuan pembelajaran", "Relevansi kontekstual"],
            "visual_type": "concept",
            "accent_color": "emerald",
            "icon": "sparkles",
            "duration_sec": 10,
            "animation_effect": "ken_burns_zoom_in"
        },
        {
            "scene_number": 2,
            "badge": "Konsep Inti",
            "title": "Mekanisme & Prinsip Kerja",
            "subtitle": "Bedah detail cara kerja dan komponen kunci",
            "narration": "Memahami mekanisme dasar adalah kunci utama. Di babak ini kita melihat bagaimana setiap komponen saling berinteraksi secara sistematis.",
            "key_points": ["Interaksi antar variabel", "Prinsip hukum fundamental", "Dampak praktis nyata"],
            "visual_type": "process",
            "accent_color": "teal",
            "icon": "zap",
            "duration_sec": 12,
            "animation_effect": "pan_right"
        },
        {
            "scene_number": 3,
            "badge": "Aplikasi Praktis",
            "title": "Implementasi & Solusi Kasus",
            "subtitle": "Penerapan teori dalam skenario nyata",
            "narration": "Kekuatan dari pemahaman teori terletak pada penerapannya di lapangan untuk memecahkan tantangan dan mengoptimalkan hasil.",
            "key_points": ["Skenario lapangan", "Optimasi efisiensi", "Mitigasi kendala umum"],
            "visual_type": "comparison",
            "accent_color": "cyan",
            "icon": "target",
            "duration_sec": 11,
            "animation_effect": "pulse_glow"
        },
        {
            "scene_number": 4,
            "badge": "Kesimpulan",
            "title": "Poin Kunci & Rekomendasi",
            "subtitle": "Ringkasan menyeluruh untuk diingat",
            "narration": "Demikianlah rangkuman esensial dari materi ini. Pastikan Anda menguasai poin-poin utama ini untuk memperkuat penguasaan kompetensi Anda.",
            "key_points": ["Konsep esensial terangkum", "Takeaway praktis", "Langkah implementasi selanjutnya"],
            "visual_type": "takeaway",
            "accent_color": "emerald",
            "icon": "award",
            "duration_sec": 10,
            "animation_effect": "ken_burns_zoom_in"
        }
    ]



