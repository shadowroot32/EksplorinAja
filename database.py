import secrets
import hashlib
import sqlite3
from typing import Optional, List, Dict, Any
import json
import os
from datetime import datetime, date, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pelajarin.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    
    # 0. OTP Codes Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        action TEXT NOT NULL,
        name TEXT DEFAULT '',
        school TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0
    );
    ''')

    # 0b. Users Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        school TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        password_hash TEXT DEFAULT '',
        google_id TEXT DEFAULT '',
        google_email TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')

    # 0c. User Sessions Table (OWASP WSTG-SESS)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        ip_address TEXT DEFAULT '',
        user_agent TEXT DEFAULT '',
        revoked INTEGER DEFAULT 0
    );
    ''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token)")

    # 0d. Rate Limits Table (OWASP WSTG-BUSL / ATHN)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        hits INTEGER DEFAULT 1,
        reset_at TIMESTAMP NOT NULL
    );
    ''')

    # 1. Subjects Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '📚',
        description TEXT DEFAULT '',
        mastery_level TEXT DEFAULT 'Novice',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Study Sets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER REFERENCES subjects(id),
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        raw_content TEXT,
        summary TEXT,
        mindmap_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Check and add subject_id, deep_doc, video_storyboard, and user_id columns if missing
    cursor.execute("PRAGMA table_info(study_sets)")
    cols = [r["name"] for r in cursor.fetchall()]
    if "subject_id" not in cols:
        cursor.execute("ALTER TABLE study_sets ADD COLUMN subject_id INTEGER REFERENCES subjects(id)")
    if "deep_doc" not in cols:
        cursor.execute("ALTER TABLE study_sets ADD COLUMN deep_doc TEXT")
    if "video_storyboard" not in cols:
        cursor.execute("ALTER TABLE study_sets ADD COLUMN video_storyboard TEXT")
    if "user_id" not in cols:
        cursor.execute("ALTER TABLE study_sets ADD COLUMN user_id INTEGER REFERENCES users(id)")

    # Check and add attempts, ip_address columns in otp_codes if missing
    cursor.execute("PRAGMA table_info(otp_codes)")
    otp_cols = [r["name"] for r in cursor.fetchall()]
    if "attempts" not in otp_cols:
        cursor.execute("ALTER TABLE otp_codes ADD COLUMN attempts INTEGER DEFAULT 0")
    if "ip_address" not in otp_cols:
        cursor.execute("ALTER TABLE otp_codes ADD COLUMN ip_address TEXT DEFAULT ''")

    # 3. Flashcards Table (with Spaced Repetition / SM-2)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        mastered INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0,
        interval_days INTEGER DEFAULT 1,
        ease_factor REAL DEFAULT 2.5,
        next_review TEXT DEFAULT '2026-10-18',
        mastery_score INTEGER DEFAULT 0,
        FOREIGN KEY (set_id) REFERENCES study_sets(id) ON DELETE CASCADE
    );
    """)

    # Check and add SM-2 columns if missing
    cursor.execute("PRAGMA table_info(flashcards)")
    fc_cols = [r["name"] for r in cursor.fetchall()]
    for col, ctype, default in [
        ("reps", "INTEGER", "0"),
        ("interval_days", "INTEGER", "1"),
        ("ease_factor", "REAL", "2.5"),
        ("next_review", "TEXT", "'2026-10-18'"),
        ("mastery_score", "INTEGER", "0")
    ]:
        if col not in fc_cols:
            cursor.execute(f"ALTER TABLE flashcards ADD COLUMN {col} {ctype} DEFAULT {default}")

    # 4. Quiz Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        options_json TEXT NOT NULL,
        answer TEXT NOT NULL,
        explanation TEXT,
        FOREIGN KEY (set_id) REFERENCES study_sets(id) ON DELETE CASCADE
    );
    """)

    # 5. Chat History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES study_sets(id) ON DELETE CASCADE
    );
    """)

    # 6. Study Logs (Streak & Study Duration per user)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        log_date DATE NOT NULL,
        study_seconds INTEGER DEFAULT 0,
        cards_reviewed INTEGER DEFAULT 0,
        quizzes_taken INTEGER DEFAULT 0,
        UNIQUE(user_id, log_date)
    );
    """)
    try:
        cursor.execute("PRAGMA table_info(study_logs)")
        cols = [r["name"] for r in cursor.fetchall()]
        if "user_id" not in cols:
            cursor.execute("ALTER TABLE study_logs RENAME TO study_logs_old")
            cursor.execute("""
                CREATE TABLE study_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL DEFAULT 1,
                    log_date DATE NOT NULL,
                    study_seconds INTEGER DEFAULT 0,
                    cards_reviewed INTEGER DEFAULT 0,
                    quizzes_taken INTEGER DEFAULT 0,
                    UNIQUE(user_id, log_date)
                )
            """)
            cursor.execute("""
                INSERT OR IGNORE INTO study_logs (id, user_id, log_date, study_seconds, cards_reviewed, quizzes_taken)
                SELECT id, 1, log_date, study_seconds, cards_reviewed, quizzes_taken FROM study_logs_old
            """)
            cursor.execute("DROP TABLE study_logs_old")
            conn.commit()
    except Exception as e:
        logger.warning(f"study_logs migration note: {e}")

    # 7. Activities Feed
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        subject_name TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 8. Podcasts Table (Audio Dialogue Study Companion)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS podcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        dialogue_json TEXT NOT NULL,
        duration_est INTEGER DEFAULT 180,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES study_sets(id) ON DELETE CASCADE
    );
    """)

    # No auto-seeding: keep database completely clean and empty as requested
    conn.commit()
    conn.close()

def get_dashboard_data(user_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()

    today = date.today()
    today_str = today.isoformat()
    uid = user_id or 1

    # 1. Streak Calculation (Per User)
    cursor.execute("SELECT log_date, study_seconds FROM study_logs WHERE user_id = ? ORDER BY log_date DESC", (uid,))
    logs = cursor.fetchall()
    dates_set = {r["log_date"] for r in logs if (r["study_seconds"] or 0) > 0}

    streak = 0
    curr = today
    if curr.isoformat() not in dates_set:
        curr = curr - timedelta(days=1)

    while curr.isoformat() in dates_set:
        streak += 1
        curr -= timedelta(days=1)

    # Longest streak calculation from history
    sorted_dates = sorted([date.fromisoformat(d) for d in dates_set])
    longest = 0
    current_run = 0
    prev_d = None
    for d in sorted_dates:
        if prev_d is None or d == prev_d + timedelta(days=1):
            current_run += 1
        else:
            current_run = 1
        if current_run > longest:
            longest = current_run
        prev_d = d
    longest = max(longest, streak)

    # Weekly calendar status (Monday - Sunday)
    weekday = today.weekday() # 0 = Monday, 6 = Sunday
    monday = today - timedelta(days=weekday)
    week_status = []
    days_labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
    for i in range(7):
        day_date = monday + timedelta(days=i)
        is_active = day_date.isoformat() in dates_set
        is_today = (day_date == today)
        is_past = (day_date < today)
        week_status.append({
            "day": days_labels[i],
            "date": day_date.isoformat(),
            "active": is_active,
            "is_today": is_today,
            "is_past": is_past
        })

    if streak == 0:
        status_msg = "Mulai belajar hari ini!"
    elif streak == 1:
        status_msg = "Awal yang bagus!"
    elif streak < 3:
        status_msg = "Pertahankan konsistensi!"
    else:
        status_msg = f"{streak} hari berturut-turut!"

    # 2. Weekly Study Stats
    seven_days_ago = (today - timedelta(days=7)).isoformat()
    cursor.execute("""
        SELECT SUM(study_seconds) as total_sec,
               SUM(cards_reviewed) as total_cards,
               SUM(quizzes_taken) as total_quizzes
        FROM study_logs WHERE user_id = ? AND log_date >= ?
    """, (uid, seven_days_ago))
    stat_row = cursor.fetchone()
    total_sec = (stat_row["total_sec"] or 0)
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    weekly_time_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

    # 3. Cards Due (Filter by User Study Sets)
    cursor.execute("""
        SELECT COUNT(f.id) FROM flashcards f
        JOIN study_sets s ON f.set_id = s.id
        WHERE (s.user_id = ? OR s.user_id IS NULL) AND (f.next_review <= ? OR f.mastery_score < 60)
    """, (uid, today_str))
    cards_due = cursor.fetchone()[0]

    # 4. Quizzes Count
    cursor.execute("""
        SELECT COUNT(q.id) FROM quiz_items q
        JOIN study_sets s ON q.set_id = s.id
        WHERE (s.user_id = ? OR s.user_id IS NULL)
    """, (uid,))
    quizzes_count = cursor.fetchone()[0]

    # 5. Average Mastery
    cursor.execute("""
        SELECT AVG(f.mastery_score) FROM flashcards f
        JOIN study_sets s ON f.set_id = s.id
        WHERE (s.user_id = ? OR s.user_id IS NULL)
    """, (uid,))
    avg_m = cursor.fetchone()[0]
    avg_mastery = int(avg_m) if avg_m is not None and avg_m > 0 else 0

    # 6. Continue Your Session
    cursor.execute("""
        SELECT s.id, s.title, sub.name as subject_name, sub.emoji,
               (SELECT COUNT(*) FROM flashcards WHERE set_id = s.id AND (next_review <= ? OR mastery_score < 60)) as due_cards
        FROM study_sets s
        LEFT JOIN subjects sub ON s.subject_id = sub.id
        WHERE (s.user_id = ? OR s.user_id IS NULL)
        ORDER BY s.id DESC LIMIT 1
    """, (today_str, uid))
    cont_row = cursor.fetchone()
    continue_session = None
    if cont_row:
        continue_session = {
            "set_id": cont_row["id"],
            "title": cont_row["title"],
            "subject_name": cont_row["subject_name"] or "General Study",
            "emoji": cont_row["emoji"] or "📖",
            "due_cards": cont_row["due_cards"] or 0
        }

    # 7. Recent Activities
    cursor.execute("SELECT id, title, activity_type, subject_name, created_at FROM activities ORDER BY id DESC LIMIT 5")
    recent_activities = [dict(r) for r in cursor.fetchall()]

    # 8. Subjects List with Stats
    cursor.execute("""
        SELECT sub.id, sub.name, sub.emoji, sub.description, sub.mastery_level,
               COUNT(s.id) as docs_count,
               COALESCE((
                   SELECT COUNT(f.id) FROM flashcards f
                   JOIN study_sets ss ON f.set_id = ss.id
                   WHERE ss.subject_id = sub.id AND (ss.user_id = ? OR ss.user_id IS NULL) AND (f.next_review <= ? OR f.mastery_score < 60)
               ), 0) as cards_due
        FROM subjects sub
        LEFT JOIN study_sets s ON sub.id = s.subject_id AND (s.user_id = ? OR s.user_id IS NULL)
        GROUP BY sub.id
        ORDER BY sub.id ASC
    """, (uid, today_str, uid))
    subjects = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "streak": {
            "current": streak,
            "longest": longest,
            "status_message": status_msg,
            "week_days": week_status
        },
        "stats": {
            "weekly_study": weekly_time_str,
            "cards_due": cards_due,
            "quizzes": quizzes_count,
            "avg_mastery": f"{avg_mastery}%"
        },
        "continue_session": continue_session,
        "recent_activities": recent_activities,
        "subjects": subjects
    }

def record_activity(title: str, activity_type: str, subject_name: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO activities (title, activity_type, subject_name) VALUES (?, ?, ?)", (title, activity_type, subject_name))
    conn.commit()
    conn.close()

def send_study_ping(seconds: int = 30, user_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    uid = user_id or 1
    cursor.execute("""
        INSERT INTO study_logs (user_id, log_date, study_seconds, cards_reviewed, quizzes_taken)
        VALUES (?, ?, ?, 0, 0)
        ON CONFLICT(user_id, log_date) DO UPDATE SET study_seconds = study_seconds + ?
    """, (uid, today_str, seconds, seconds))
    conn.commit()
    conn.close()

def rate_flashcard(card_id: int, rating: int, user_id: Optional[int] = None):
    # rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, set_id, reps, interval_days, ease_factor, mastery_score FROM flashcards WHERE id = ?", (card_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    reps = row["reps"] or 0
    interval_days = row["interval_days"] or 1
    ease_factor = row["ease_factor"] or 2.5
    mastery_score = row["mastery_score"] or 0

    if rating == 1: # Again
        reps = 0
        interval_days = 1
        ease_factor = max(1.3, ease_factor - 0.2)
        mastery_score = max(0, mastery_score - 20)
    elif rating == 2: # Hard
        reps += 1
        interval_days = max(1, int(interval_days * 1.2))
        ease_factor = max(1.3, ease_factor - 0.15)
        mastery_score = min(100, mastery_score + 10)
    elif rating == 3: # Good
        if reps == 0:
            interval_days = 1
        elif reps == 1:
            interval_days = 3
        else:
            interval_days = max(1, int(interval_days * ease_factor))
        reps += 1
        mastery_score = min(100, mastery_score + 25)
    else: # 4: Easy
        if reps == 0:
            interval_days = 3
        elif reps == 1:
            interval_days = 6
        else:
            interval_days = max(1, int(interval_days * ease_factor * 1.3))
        reps += 1
        ease_factor += 0.15
        mastery_score = min(100, mastery_score + 35)

    next_review = (date.today() + timedelta(days=interval_days)).isoformat()
    mastered = 1 if mastery_score >= 80 else 0

    cursor.execute("""
        UPDATE flashcards
        SET reps = ?, interval_days = ?, ease_factor = ?, next_review = ?, mastery_score = ?, mastered = ?
        WHERE id = ?
    """, (reps, interval_days, ease_factor, next_review, mastery_score, mastered, card_id))

    today_str = date.today().isoformat()
    uid = user_id or 1
    cursor.execute("""
        INSERT INTO study_logs (user_id, log_date, study_seconds, cards_reviewed, quizzes_taken)
        VALUES (?, ?, 30, 1, 0)
        ON CONFLICT(user_id, log_date) DO UPDATE SET
            cards_reviewed = cards_reviewed + 1,
            study_seconds = study_seconds + 30
    """, (uid, today_str))

    conn.commit()
    conn.close()

    return {
        "id": card_id,
        "rating": rating,
        "reps": reps,
        "interval_days": interval_days,
        "next_review": next_review,
        "mastery_score": mastery_score,
        "mastered": bool(mastered)
    }

def get_due_flashcards(set_id: int = None):
    conn = get_db()
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    if set_id:
        cursor.execute("""
            SELECT id, set_id, front, back, reps, interval_days, mastery_score, next_review
            FROM flashcards
            WHERE set_id = ? AND (next_review <= ? OR mastery_score < 70)
            ORDER BY next_review ASC
        """, (set_id, today_str))
    else:
        cursor.execute("""
            SELECT id, set_id, front, back, reps, interval_days, mastery_score, next_review
            FROM flashcards
            WHERE next_review <= ? OR mastery_score < 70
            ORDER BY next_review ASC
        """, (today_str,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_all_subjects():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sub.id, sub.name, sub.emoji, sub.description, sub.mastery_level,
               COUNT(s.id) as docs_count
        FROM subjects sub
        LEFT JOIN study_sets s ON sub.id = s.subject_id
        GROUP BY sub.id
        ORDER BY sub.id ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def create_subject(name: str, emoji: str = "📚", description: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO subjects (name, emoji, description, mastery_level) VALUES (?, ?, ?, 'Novice')", (name, emoji, description))
    sub_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return sub_id

def save_study_set(title, source_type, raw_content, summary, flashcards, quiz, mindmap, subject_id=None, user_id=None):
    conn = get_db()
    cursor = conn.cursor()

    if not subject_id:
        cursor.execute("SELECT id FROM subjects ORDER BY id ASC LIMIT 1")
        sub_row = cursor.fetchone()
        subject_id = sub_row[0] if sub_row else 1

    cursor.execute(
        "INSERT INTO study_sets (subject_id, user_id, title, source_type, raw_content, summary, mindmap_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (subject_id, user_id, title, source_type, raw_content, summary, json.dumps(mindmap, ensure_ascii=False))
    )
    set_id = cursor.lastrowid

    today_str = date.today().isoformat()
    for fc in flashcards:
        cursor.execute(
            """INSERT INTO flashcards (set_id, front, back, mastered, reps, interval_days, ease_factor, next_review, mastery_score)
               VALUES (?, ?, ?, 0, 0, 1, 2.5, ?, 0)""",
            (set_id, fc.get("front", ""), fc.get("back", ""), today_str)
        )

    for q in quiz:
        cursor.execute(
            "INSERT INTO quiz_items (set_id, question, options_json, answer, explanation) VALUES (?, ?, ?, ?, ?)",
            (set_id, q.get("question", ""), json.dumps(q.get("options", []), ensure_ascii=False), q.get("answer", ""), q.get("explanation", ""))
        )

    cursor.execute("SELECT name FROM subjects WHERE id = ?", (subject_id,))
    s_name = cursor.fetchone()
    sub_name = s_name[0] if s_name else ""
    cursor.execute("INSERT INTO activities (title, activity_type, subject_name) VALUES (?, 'new_doc', ?)", (f"Materi baru: {title}", sub_name))

    conn.commit()
    conn.close()
    return set_id

def get_all_study_sets(subject_id=None, user_id=None):
    conn = get_db()
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    query = """
        SELECT s.id, s.subject_id, s.user_id, s.title, s.source_type, s.created_at,
               sub.name as subject_name, sub.emoji as subject_emoji,
               (SELECT COUNT(*) FROM flashcards WHERE set_id = s.id) as flashcards_count,
               (SELECT COUNT(*) FROM flashcards WHERE set_id = s.id AND (next_review <= ? OR mastery_score < 60)) as due_cards_count,
               (SELECT COUNT(*) FROM quiz_items WHERE set_id = s.id) as quiz_count
        FROM study_sets s
        LEFT JOIN subjects sub ON s.subject_id = sub.id
    """
    params = [today_str]
    conditions = []
    if subject_id:
        conditions.append("s.subject_id = ?")
        params.append(subject_id)
    if user_id is not None:
        conditions.append("(s.user_id = ? OR s.user_id IS NULL)")
        params.append(user_id)
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY s.id DESC"
    
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_study_set_details(set_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.*, sub.name as subject_name, sub.emoji as subject_emoji
        FROM study_sets s
        LEFT JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.id = ?
    """, (set_id,))
    s_row = cursor.fetchone()
    if not s_row:
        conn.close()
        return None

    data = dict(s_row)
    if data.get("mindmap_json"):
        try:
            data["mindmap"] = json.loads(data["mindmap_json"])
        except Exception:
            data["mindmap"] = {}
    else:
        data["mindmap"] = {}

    data["deep_doc"] = s_row["deep_doc"] if "deep_doc" in s_row.keys() and s_row["deep_doc"] else ""
    if "video_storyboard" in s_row.keys() and s_row["video_storyboard"]:
        try:
            data["video_storyboard"] = json.loads(s_row["video_storyboard"])
        except Exception:
            data["video_storyboard"] = []
    else:
        data["video_storyboard"] = []

    cursor.execute("""
        SELECT id, front, back, mastered, reps, interval_days, ease_factor, next_review, mastery_score
        FROM flashcards WHERE set_id = ? ORDER BY id ASC
    """, (set_id,))
    data["flashcards"] = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, question, options_json, answer, explanation FROM quiz_items WHERE set_id = ? ORDER BY id ASC", (set_id,))
    quiz_list = []
    for r in cursor.fetchall():
        q_item = dict(r)
        try:
            q_item["options"] = json.loads(q_item["options_json"])
        except Exception:
            q_item["options"] = []
        quiz_list.append(q_item)
    data["quiz"] = quiz_list

    cursor.execute("SELECT role, message, created_at FROM chat_messages WHERE set_id = ? ORDER BY id ASC", (set_id,))
    data["chat_history"] = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, title, dialogue_json, duration_est FROM podcasts WHERE set_id = ?", (set_id,))
    pod_row = cursor.fetchone()
    if pod_row:
        pod_data = dict(pod_row)
        try:
            pod_data["dialogue"] = json.loads(pod_data["dialogue_json"])
        except Exception:
            pod_data["dialogue"] = []
        data["podcast"] = pod_data
    else:
        data["podcast"] = None

    conn.close()
    return data

def save_podcast(set_id: int, title: str, dialogue: list):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM podcasts WHERE set_id = ?", (set_id,))
    cursor.execute(
        "INSERT INTO podcasts (set_id, title, dialogue_json, duration_est) VALUES (?, ?, ?, ?)",
        (set_id, title, json.dumps(dialogue, ensure_ascii=False), len(dialogue) * 12)
    )
    conn.commit()
    conn.close()

def get_podcast(set_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, dialogue_json, duration_est FROM podcasts WHERE set_id = ?", (set_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    try:
        d["dialogue"] = json.loads(d["dialogue_json"])
    except Exception:
        d["dialogue"] = []
    return d

def toggle_flashcard_mastery(card_id, mastered):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE flashcards SET mastered = ? WHERE id = ?", (1 if mastered else 0, card_id))
    conn.commit()
    conn.close()

def add_chat_message(set_id, role, message):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO chat_messages (set_id, role, message) VALUES (?, ?, ?)", (set_id, role, message))
    conn.commit()
    conn.close()

def delete_study_set(set_id, user_id=None):
    conn = get_db()
    cursor = conn.cursor()
    if user_id is not None:
        cursor.execute("SELECT id, user_id FROM study_sets WHERE id = ?", (set_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False
        # OWASP WSTG-ATHZ-01: BOLA/IDOR protection - reject deletion if not owner
        if row["user_id"] is not None and row["user_id"] != user_id:
            conn.close()
            return False
            
    cursor.execute("DELETE FROM flashcards WHERE set_id = ?", (set_id,))
    cursor.execute("DELETE FROM quiz_items WHERE set_id = ?", (set_id,))
    cursor.execute("DELETE FROM chat_messages WHERE set_id = ?", (set_id,))
    cursor.execute("DELETE FROM podcasts WHERE set_id = ?", (set_id,))
    cursor.execute("DELETE FROM study_sets WHERE id = ?", (set_id,))
    conn.commit()
    conn.close()
    return True

def export_study_set(set_id: int, export_format: str = "anki", user_id: Optional[int] = None):
    details = get_study_set_details(set_id, user_id=user_id)
    if not details:
        return None, ""

    title = details["title"]
    if export_format == "anki":
        lines = []
        for fc in details["flashcards"]:
            f = fc["front"].replace("\t", " ").replace("\n", "<br>")
            b = fc["back"].replace("\t", " ").replace("\n", "<br>")
            lines.append(f"{f}\t{b}\tPelajarinAI")
        content = "\n".join(lines)
        filename = f"{title.replace(' ', '_')}_anki.txt"
        return filename, content
    elif export_format == "markdown":
        lines = [f"# {title}", "", "## Rangkuman Materi", details.get("summary", ""), "", "## Flashcards"]
        for fc in details["flashcards"]:
            lines.append(f"- **Q:** {fc['front']}\n  **A:** {fc['back']}")
        lines.append("\n## Kuis & Latihan Soal")
        for i, q in enumerate(details["quiz"]):
            lines.append(f"{i+1}. {q['question']}")
            for opt in q.get("options", []):
                lines.append(f"   - {opt}")
            lines.append(f"   *Kunci Jawaban: {q['answer']}*")
            if q.get("explanation"):
                lines.append(f"   *Pembahasan: {q['explanation']}*\n")
        content = "\n".join(lines)
        filename = f"{title.replace(' ', '_')}.md"
        return filename, content
    elif export_format == "json":
        content = json.dumps(details, ensure_ascii=False, indent=2)
        filename = f"{title.replace(' ', '_')}.json"
        return filename, content
    return None, ""


def save_deep_document(set_id: int, content: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE study_sets SET deep_doc = ? WHERE id = ?", (content, set_id))
    conn.commit()
    conn.close()

def get_deep_document(set_id: int, user_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if user_id is not None:
        cursor.execute("SELECT id, title, raw_content, summary, deep_doc FROM study_sets WHERE id = ? AND user_id = ?", (set_id, user_id))
    else:
        cursor.execute("SELECT id, title, raw_content, summary, deep_doc FROM study_sets WHERE id = ?", (set_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def save_video_storyboard(set_id: int, storyboard: list):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE study_sets SET video_storyboard = ? WHERE id = ?", (json.dumps(storyboard, ensure_ascii=False), set_id))
    conn.commit()
    conn.close()

def get_video_storyboard(set_id: int, user_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if user_id is not None:
        cursor.execute("SELECT id, title, summary, raw_content, video_storyboard FROM study_sets WHERE id = ? AND user_id = ?", (set_id, user_id))
    else:
        cursor.execute("SELECT id, title, summary, raw_content, video_storyboard FROM study_sets WHERE id = ?", (set_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    res = dict(row)
    if res.get("video_storyboard"):
        try:
            res["storyboard"] = json.loads(res["video_storyboard"])
        except Exception:
            res["storyboard"] = []
    else:
        res["storyboard"] = []
    return res


def get_user_by_id(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_email(email: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_or_create_user(email: str, first_name: str = "", last_name: str = "", google_id: str = "", avatar_url: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    if row:
        u = dict(row)
        # Update google info if available
        if google_id and not u.get("google_id"):
            cursor.execute("UPDATE users SET google_id = ?, google_email = ? WHERE id = ?", (google_id, email, u["id"]))
            conn.commit()
            u["google_id"] = google_id
            u["google_email"] = email
        conn.close()
        return u
    
    cursor.execute("""
        INSERT INTO users (email, first_name, last_name, school, avatar_url, google_id, google_email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (email.strip(), first_name, last_name, "", avatar_url, google_id, email if google_id else ""))
    user_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    new_user = dict(cursor.fetchone())
    conn.close()
    return new_user

def update_user_profile(user_id: int, first_name: str, last_name: str, school: str, avatar_url: str = None):
    conn = get_db()
    cursor = conn.cursor()
    if avatar_url:
        cursor.execute("""
            UPDATE users 
            SET first_name = ?, last_name = ?, school = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (first_name, last_name, school, avatar_url, user_id))
    else:
        cursor.execute("""
            UPDATE users 
            SET first_name = ?, last_name = ?, school = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (first_name, last_name, school, user_id))
    conn.commit()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated

def register_user(email: str, password: str = "", first_name: str = "", last_name: str = "", school: str = "", avatar_url: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    if row:
        conn.close()
        return None, "Email sudah terdaftar. Silakan gunakan menu Masuk."
    
    pw_hash = hashlib.sha256(password.encode("utf-8")).hexdigest() if password else ""
    cursor.execute("""
        INSERT INTO users (email, first_name, last_name, school, avatar_url, password_hash)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (email.strip(), first_name.strip(), last_name.strip(), school.strip(), avatar_url, pw_hash))
    user_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    new_user = dict(cursor.fetchone())
    conn.close()
    return new_user, "Pendaftaran berhasil"

def verify_user_password(email: str, password: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None, "Akun dengan email tersebut belum terdaftar. Silakan daftar terlebih dahulu."
    
    u = dict(row)
    pw_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if u.get("password_hash"):
        if u["password_hash"] == pw_hash:
            conn.close()
            return u, "Login berhasil"
        else:
            conn.close()
            return None, "Password yang Anda masukkan salah."
    else:
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pw_hash, u["id"]))
        conn.commit()
        u["password_hash"] = pw_hash
        conn.close()
        return u, "Password berhasil disetel dan login sukses."

def create_otp(email: str, code: str, action: str = 'register', name: str = '', school: str = '', expires_minutes: int = 10, ip_address: str = ''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE otp_codes SET used = 1 WHERE LOWER(email) = LOWER(?) AND action = ? AND used = 0", (email.strip(), action))
    expires_at = (datetime.now() + timedelta(minutes=expires_minutes)).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        INSERT INTO otp_codes (email, code, action, name, school, expires_at, used, attempts, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
    ''', (email.strip().lower(), str(code).strip(), action, name.strip(), school.strip(), expires_at, str(ip_address)[:45]))
    otp_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return otp_id

def verify_otp_code(email: str, code: str, action: str = None):
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    clean_email = email.strip().lower()
    clean_code = str(code).strip()
    
    # OWASP WSTG-ATHN-03: Track attempts per active code to eliminate OTP brute force
    cursor.execute(
        "SELECT * FROM otp_codes WHERE LOWER(email) = LOWER(?) AND used = 0 ORDER BY id DESC LIMIT 1",
        (clean_email,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False, "Tidak ada kode OTP aktif untuk email ini. Silakan minta kode baru.", None
    
    otp = dict(row)
    attempts = otp.get("attempts", 0) or 0
    
    if otp["expires_at"] < now_str:
        cursor.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (otp["id"],))
        conn.commit()
        conn.close()
        return False, "Kode OTP telah kedaluwarsa. Silakan minta kode baru.", None
    
    if attempts >= 5:
        cursor.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (otp["id"],))
        conn.commit()
        conn.close()
        return False, "Batas percobaan OTP terlampaui (maksimal 5 kali). Kode dinonaktifkan demi keamanan. Silakan minta kode baru.", None
    
    if otp["code"] != clean_code:
        new_attempts = attempts + 1
        cursor.execute("UPDATE otp_codes SET attempts = ? WHERE id = ?", (new_attempts, otp["id"]))
        conn.commit()
        remaining = 5 - new_attempts
        if remaining <= 0:
            cursor.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (otp["id"],))
            conn.commit()
            conn.close()
            return False, "Kode OTP salah. Batas percobaan telah habis. Silakan minta kode baru.", None
        conn.close()
        return False, f"Kode OTP tidak sesuai. Sisa kesempatan: {remaining} kali.", None
    
    if action and otp["action"] != action:
        conn.close()
        return False, f"Kode OTP tidak cocok untuk aksi {action}.", None
    
    cursor.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (otp["id"],))
    conn.commit()
    conn.close()
    return True, "Kode OTP valid.", otp

# OWASP WSTG-SESS: Cryptographically secure session management
def create_session(user_id: int, ip_address: str = "", user_agent: str = "", days: int = 14) -> str:
    token = secrets.token_urlsafe(32)
    conn = get_db()
    cursor = conn.cursor()
    expires_at = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        INSERT INTO user_sessions (token, user_id, expires_at, ip_address, user_agent, revoked)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (token, user_id, expires_at, str(ip_address)[:45], str(user_agent)[:255]))
    conn.commit()
    conn.close()
    return token

def validate_session(token: str) -> dict:
    if not token or len(token) < 20:
        return None
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        SELECT s.token, s.user_id, s.expires_at, u.id, u.email, u.first_name, u.last_name, u.school, u.avatar_url
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.revoked = 0 AND s.expires_at > ?
    ''', (token, now_str))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    res = dict(row)
    return {
        "id": res["id"],
        "email": res["email"],
        "first_name": res["first_name"],
        "last_name": res["last_name"],
        "school": res["school"],
        "avatar_url": res["avatar_url"],
        "session_token": res["token"]
    }

def revoke_session(token: str) -> bool:
    if not token:
        return False
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE user_sessions SET revoked = 1 WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    return True

def revoke_all_user_sessions(user_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE user_sessions SET revoked = 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

# OWASP WSTG-BUSL / ATHN: Sliding window rate limiter
def check_rate_limit(key: str, max_hits: int = 10, window_seconds: int = 60) -> tuple:
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("SELECT hits, reset_at FROM rate_limits WHERE key = ?", (key,))
    row = cursor.fetchone()
    if not row:
        reset_at = (now + timedelta(seconds=window_seconds)).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("INSERT INTO rate_limits (key, hits, reset_at) VALUES (?, 1, ?)", (key, reset_at))
        conn.commit()
        conn.close()
        return True, max_hits - 1
    
    hits = row["hits"]
    reset_at = row["reset_at"]
    if now_str > reset_at:
        new_reset = (now + timedelta(seconds=window_seconds)).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("UPDATE rate_limits SET hits = 1, reset_at = ? WHERE key = ?", (new_reset, key))
        conn.commit()
        conn.close()
        return True, max_hits - 1
    
    if hits >= max_hits:
        conn.close()
        return False, 0
    
    cursor.execute("UPDATE rate_limits SET hits = hits + 1 WHERE key = ?", (key,))
    conn.commit()
    conn.close()
    return True, max_hits - (hits + 1)

def get_latest_otp(email: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM otp_codes WHERE LOWER(email) = LOWER(?) ORDER BY id DESC LIMIT 1", (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_user_account(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
