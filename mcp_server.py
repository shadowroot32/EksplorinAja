import sys
import os
import json

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from mcp.server.mcpserver import MCPServer
import database
import ai_engine

database.init_db()

mcp = MCPServer("pelajarin-ai-mcp", description="Server MCP Cendekia.ai & Kuliko Pro untuk belajar mandiri (Rangkuman, Spaced Repetition Flashcards, Kuis, Mindmap, AI Podcast, Tutor AI)")

@mcp.tool(
    name="pelajarin_get_dashboard_momentum",
    description="Melihat data dashboard belajar harian: streak belajar (hari berturut-turut), total jam belajar mingguan, jumlah flashcard yang harus direview hari ini, dan ringkasan aktivitas."
)
def pelajarin_get_dashboard_momentum() -> str:
    """Mengembalikan data statistik belajar, streak harian, dan ringkasan momentum."""
    data = database.get_dashboard_data()
    return json.dumps(data, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_list_subjects",
    description="Melihat seluruh daftar subjek/mata pelajaran dan kategori materi belajar yang ada."
)
def pelajarin_list_subjects() -> str:
    """Mengembalikan daftar semua subjek beserta jumlah dokumen dan kartu review."""
    subs = database.get_all_subjects()
    return json.dumps(subs, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_create_subject",
    description="Membuat subjek/kategori pelajaran baru."
)
def pelajarin_create_subject(name: str, emoji: str = "📚", description: str = "") -> str:
    """Membuat subjek baru di sistem."""
    sub_id = database.create_subject(name, emoji, description)
    return json.dumps({"status": "success", "id": sub_id, "name": name, "emoji": emoji})

@mcp.tool(
    name="pelajarin_list_study_sets",
    description="Melihat seluruh daftar materi belajar yang tersimpan di Cendekia.ai lokal."
)
def pelajarin_list_study_sets(subject_id: int = 0) -> str:
    """Mengembalikan daftar semua materi belajar yang pernah dibuat."""
    sets = database.get_all_study_sets(subject_id if subject_id > 0 else None)
    return json.dumps(sets, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_get_study_set",
    description="Mengambil data lengkap sebuah materi (ringkasan, flashcard, soal kuis, mindmap, podcast) berdasarkan ID materi."
)
def pelajarin_get_study_set(set_id: int) -> str:
    """Mengambil materi belajar lengkap berdasarkan set_id."""
    data = database.get_study_set_details(set_id)
    if not data:
        return f"Error: Materi dengan ID {set_id} tidak ditemukan."
    return json.dumps(data, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_create_from_text",
    description="Membuat paket belajar baru (ringkasan cerdas, flashcard, kuis interaktif, mindmap) dari teks catatan atau materi yang diinput."
)
def pelajarin_create_from_text(text_content: str, title: str = "", level: str = "standar", subject_id: int = 0) -> str:
    """Menganalisis teks materi dan membuat paket belajar terstruktur lengkap."""
    if not text_content.strip():
        return "Error: Teks materi tidak boleh kosong."
    
    pack = ai_engine.generate_study_pack(text_content, level=level, custom_title=title)
    final_title = pack.get("title") or title or "Catatan Belajar Baru"
    summary = pack.get("summary", "")
    flashcards = pack.get("flashcards", [])
    quiz = pack.get("quiz", [])
    mindmap = pack.get("mindmap", {})

    set_id = database.save_study_set(
        title=final_title,
        source_type="text",
        raw_content=text_content,
        summary=summary,
        flashcards=flashcards,
        quiz=quiz,
        mindmap=mindmap,
        subject_id=subject_id if subject_id > 0 else None
    )

    return json.dumps({
        "status": "success",
        "set_id": set_id,
        "title": final_title,
        "flashcards_count": len(flashcards),
        "quiz_count": len(quiz),
        "summary_preview": summary[:500] + "..."
    }, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_create_from_youtube",
    description="Mengekstrak transkrip dari video YouTube dan otomatis menghasilkan paket belajar lengkap (rangkuman, flashcard, kuis, mindmap)."
)
def pelajarin_create_from_youtube(url: str, custom_title: str = "", level: str = "standar", subject_id: int = 0) -> str:
    """Mengekstrak transkrip YouTube dan menghasilkan paket belajar."""
    try:
        transcript = ai_engine.extract_youtube_transcript(url)
    except Exception as e:
        return f"Error mengekstrak YouTube: {str(e)}"
    
    pack = ai_engine.generate_study_pack(transcript, level=level, custom_title=custom_title)
    final_title = pack.get("title") or custom_title or "Materi YouTube"
    summary = pack.get("summary", "")
    flashcards = pack.get("flashcards", [])
    quiz = pack.get("quiz", [])
    mindmap = pack.get("mindmap", {})

    set_id = database.save_study_set(
        title=final_title,
        source_type="youtube",
        raw_content=f"URL: {url}\n\nTranskrip:\n{transcript}",
        summary=summary,
        flashcards=flashcards,
        quiz=quiz,
        mindmap=mindmap,
        subject_id=subject_id if subject_id > 0 else None
    )

    return json.dumps({
        "status": "success",
        "set_id": set_id,
        "title": final_title,
        "source": url,
        "flashcards_count": len(flashcards),
        "quiz_count": len(quiz)
    }, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_rate_flashcard",
    description="Melakukan penilaian flashcard menggunakan Spaced Repetition SM-2: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)."
)
def pelajarin_rate_flashcard(card_id: int, rating: int) -> str:
    """Menilai pemahaman kartu belajar dan menghitung jadwal repetisi berikutnya."""
    res = database.rate_flashcard(card_id, rating)
    if not res:
        return f"Error: Flashcard ID {card_id} tidak ditemukan."
    return json.dumps(res, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_list_due_flashcards",
    description="Mendapatkan daftar kartu flashcard yang jatuh tempo untuk direview hari ini."
)
def pelajarin_list_due_flashcards(set_id: int = 0) -> str:
    """Mengambil flashcards yang perlu direview hari ini."""
    cards = database.get_due_flashcards(set_id if set_id > 0 else None)
    return json.dumps(cards, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_get_podcast_dialogue",
    description="Mengambil atau menghasilkan rekaman skrip audio podcast 2 host (Leo & Maya) untuk materi belajar tertentu."
)
def pelajarin_get_podcast_dialogue(set_id: int) -> str:
    """Mengambil atau membuat podcast edukasi interaktif."""
    pod = database.get_podcast(set_id)
    if not pod:
        details = database.get_study_set_details(set_id)
        if not details:
            return f"Error: Materi ID {set_id} tidak ditemukan."
        dialogue = ai_engine.generate_podcast_episode(details["title"], details.get("summary", ""))
        database.save_podcast(set_id, details["title"], dialogue)
        pod = database.get_podcast(set_id)
    return json.dumps(pod, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_ask_tutor",
    description="Bertanya langsung ke Tutor AI Cendekia seputar materi yang sedang dipelajari berdasarkan ID materi."
)
def pelajarin_ask_tutor(set_id: int, question: str) -> str:
    """Menjawab pertanyaan seputar materi spesifik menggunakan AI Tutor."""
    data = database.get_study_set_details(set_id)
    if not data:
        return f"Error: Materi dengan ID {set_id} tidak ditemukan."
    
    ans = ai_engine.chat_tutor(
        raw_content=data.get("raw_content", ""),
        summary=data.get("summary", ""),
        chat_history=data.get("chat_history", []),
        question=question
    )

    database.add_chat_message(set_id, "user", question)
    database.add_chat_message(set_id, "assistant", ans)

    return ans

if __name__ == "__main__":
    mcp.run("stdio")

@mcp.tool(
    name="pelajarin_get_deep_document",
    description="Mengambil atau menghasilkan Dokumen Lengkap (Deep Document) ala Kuliko yang membedah isi berkas/PDF secara utuh tanpa pemangkasan atau ringkasan dalam Bahasa Indonesia."
)
def pelajarin_get_deep_document(set_id: int) -> str:
    """Mengambil teks komprehensif deep document berdasarkan set_id."""
    details = database.get_deep_document(set_id)
    if not details:
        return json.dumps({"error": "Materi tidak ditemukan"}, ensure_ascii=False)
    if not details.get("deep_doc"):
        raw_content = details.get("raw_content") or details.get("summary") or ""
        deep_doc = ai_engine.generate_deep_document(raw_content, details["title"])
        database.save_deep_document(set_id, deep_doc)
        details["deep_doc"] = deep_doc
    return json.dumps({
        "id": details["id"],
        "title": details["title"],
        "deep_doc": details["deep_doc"]
    }, ensure_ascii=False, indent=2)

@mcp.tool(
    name="pelajarin_get_video_storyboard",
    description="Mengambil atau menghasilkan storyboard video materi edukasi ala Google NotebookLM Video Overview untuk suatu materi belajar."
)
def pelajarin_get_video_storyboard(set_id: int, format_type: str = "explainer") -> str:
    """Mengambil data multi-scene storyboard video (Explainer 16:9 atau Short 9:16)."""
    data = database.get_video_storyboard(set_id)
    if not data:
        return json.dumps({"error": "Materi tidak ditemukan"}, ensure_ascii=False)
    if not data.get("storyboard") or len(data["storyboard"]) == 0:
        storyboard = ai_engine.generate_video_storyboard(data.get("raw_content", ""), data.get("summary", ""), data["title"], format_type)
        database.save_video_storyboard(set_id, storyboard)
        data["storyboard"] = storyboard
    return json.dumps({
        "id": data["id"],
        "title": data["title"],
        "format_type": format_type,
        "storyboard": data["storyboard"]
    }, ensure_ascii=False, indent=2)
