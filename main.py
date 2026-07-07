import os
import json
import time
import secrets
import hashlib
import sqlite3
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types  

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Insider NITT Core Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "insider_nitt.db"

# --- DATABASE SCHEMA INITIALIZATION ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            grad_year INTEGER NOT NULL,
            status TEXT NOT NULL,
            token TEXT
        )
    """)
    
    # Auto-migration patch tracker for user token strings
    cursor.execute("PRAGMA table_info(users)")
    columns = [info[1] for info in cursor.fetchall()]
    if "token" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN token TEXT")
        
    # Experiences database table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_name TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            tech_stack TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding TEXT NOT NULL
        )
    """)

    # Mock Interviews persistence database table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mock_interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_name TEXT NOT NULL,
            role_type TEXT NOT NULL, -- 'HOSTING' or 'REQUESTING'
            topic TEXT NOT NULL,
            time_window TEXT NOT NULL,
            status TEXT DEFAULT 'OPEN', -- 'OPEN' or 'ACCEPTED'
            accepted_by TEXT
        )
    """)

    # Real-Time Core Messaging Notification alerts database table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_name TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0
        )
    """)
    
    conn.commit()
    conn.close()
    print("[SYSTEM LOG] SQL Master Database schema layouts initialized successfully.")

init_db()

def hash_password(password: str) -> str:
    salt = b'insider_nitt_fixed_system_salt_2026'
    iterations = 100000
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations)
    return hashed.hex()

def generate_session_token() -> str:
    return secrets.token_hex(32)

def dot_product(v1, v2):
    return sum(x * y for x, y in zip(v1, v2))

try:
    client = genai.Client()
    print("[SYSTEM LOG] GenAI Engine Client context loaded successfully.")
except Exception as e:
    print(f"[SYSTEM ALERT] Initialization failed. Verify your GEMINI_API_KEY inside .env. Error: {e}")
    client = None


# --- AUTHENTICATION RESOURCE CONTROLLERS ---
@app.post("/api/register")
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    grad_year: int = Form(...)
):
    status_map = {2030: "FRESHER", 2029: "SOPHOMORE", 2028: "PREFINAL YEAR", 2027: "FINAL YEAR"}
    status = status_map.get(grad_year, "UNKNOWN")
    pwd_hash = hash_password(password)
    token = generate_session_token()
    
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, grad_year, status, token) VALUES (?, ?, ?, ?, ?, ?)",
            (name, email, pwd_hash, grad_year, status, token)
        )
        conn.commit()
        conn.close()
        return {"status": "SUCCESS", "token": token, "user": {"name": name, "status": status}}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="CRITICAL: Email ID already registered.")


@app.post("/api/login")
async def login_user(email: str = Form(...), password: str = Form(...)):
    pwd_hash = hash_password(password)
    token = generate_session_token()
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT name, status FROM users WHERE email = ? AND password_hash = ?", (email, pwd_hash))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="ACCESS REJECTED: Invalid credentials.")
    
    cursor.execute("UPDATE users SET token = ? WHERE email = ?", (token, email))
    conn.commit()
    conn.close()
    
    return {"status": "SUCCESS", "token": token, "user": {"name": user[0], "status": user[1]}}


@app.post("/api/verify-token")
async def verify_token(token: str = Form(...)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT name, status FROM users WHERE token = ?", (token,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session token trace context.")
    return {"status": "SUCCESS", "user": {"name": user[0], "status": user[1]}}


# --- KNOWLEDGE EXPERIENCES SYSTEM MODULE ---
@app.post("/api/save-experience")
async def save_experience(
    author_name: str = Form(...),
    entry_type: str = Form(...),
    entry_title: str = Form(...),
    content: str = Form(...)
):
    if not client:
        raise HTTPException(status_code=500, detail="GenAI context unavailable.")
    
    tech_stack = "GENERAL"
    for attempt in range(3):
        try:
            tech_response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"Extract a comma-separated list of technical tools, languages, frameworks, or company names from this title and content text. Return only the comma-separated list and nothing else: Title: {entry_title}\nContent: {content[:300]}"
            )
            extracted_tech = tech_response.text.strip().replace("[", "").replace("]", "")
            if extracted_tech:
                tech_stack = extracted_tech
            break
        except Exception as e:
            if "503" in str(e) and attempt < 2:
                time.sleep(1.5 * (attempt + 1))
                continue
            print(f"[SYSTEM WARNING] Tech stack extraction bypassed: {e}")

    embedding_vector = None
    for attempt in range(3):
        try:
            formatted_document = f"title: {entry_title} | text: {content}"
            embed_response = client.models.embed_content(
                model="gemini-embedding-2",
                contents=formatted_document
            )
            embedding_vector = embed_response.embeddings[0].values
            break
        except Exception as e:
            if "503" in str(e) and attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            raise HTTPException(status_code=500, detail=f"API Vector Resolution Error: {str(e)}")

    if embedding_vector is None:
        raise HTTPException(status_code=500, detail="Failed to resolve coordinate map.")

    embedding_string = json.dumps(embedding_vector)

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO experiences (author_name, type, title, tech_stack, content, embedding) VALUES (?, ?, ?, ?, ?, ?)",
            (author_name, entry_type, entry_title, tech_stack, content, embedding_string)
        )
        conn.commit()
        conn.close()
        return {"status": "SUCCESS", "tech_stack": tech_stack}
    except Exception as db_err:
        raise HTTPException(status_code=500, detail=f"Database ledger compilation fault: {str(db_err)}")


@app.get("/api/get-experiences")
async def get_experiences():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, author_name, type, title, tech_stack, content FROM experiences ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append({
            "id": r[0], "author": r[1], "type": r[2], "title": r[3], "tech": r[4], "content": r[5]
        })
    return {"experiences": results}


@app.post("/api/search-rag")
async def search_rag(query: str = Form(...), filter_type: str = Form(...)):
    if not client:
        raise HTTPException(status_code=500, detail="GenAI context uninitialized.")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, author_name, type, title, tech_stack, content, embedding FROM experiences")
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return {"ai_synthesis": "No historical repository metrics present to read context documents from.", "results": []}

    formatted_query = f"task: search result | query: {query}"
    query_embed_resp = client.models.embed_content(model="gemini-embedding-2", contents=formatted_query)
    query_vector = query_embed_resp.embeddings[0].values

    scored_records = []
    for r in rows:
        if filter_type != "all" and r[2] != filter_type:
            continue
            
        record_vector = json.loads(r[6])
        if len(record_vector) != len(query_vector):
            continue
            
        similarity = dot_product(query_vector, record_vector)
        scored_records.append({
            "score": similarity, "author": r[1], "type": r[2], "title": r[3], "tech": r[4], "content": r[5]
        })

    scored_records.sort(key=lambda x: x["score"], reverse=True)
    top_matches = scored_records[:3]

    if top_matches and top_matches[0]["score"] > 0.1:
        context_string = "\n\n".join([f"--- RECORD ELEMENT ---\nTITLE: {m['title']}\nSTACK: {m['tech']}\nCONTENT: {m['content']}" for m in top_matches])
        rag_prompt = f"""
        You are the Insider NITT Central Knowledge Engine. 
        Analyze the following historical matching student records from our database to solve the user prompt query.
        Database Context Documents: {context_string}
        User Inquiry Query: "{query}"
        Write a concise, highly specific synthesis brief helping the user. Direct advice only using available records.
        """
        synthesis_resp = client.models.generate_content(model="gemini-2.5-flash", contents=rag_prompt)
        ai_synthesis = synthesis_resp.text
    else:
        ai_synthesis = "No close semantic architectural pieces discovered inside the database logs to summarize reliably."

    return {"ai_synthesis": ai_synthesis, "results": scored_records[:15]}


# --- PERSISTENT MOCK INTERVIEWS MODULE ---
@app.post("/api/save-mock")
async def save_mock(
    author_name: str = Form(...),
    role_type: str = Form(...),
    topic: str = Form(...),
    time_window: str = Form(...)
):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO mock_interviews (author_name, role_type, topic, time_window) VALUES (?, ?, ?, ?)",
            (author_name, role_type, topic, time_window)
        )
        conn.commit()
        conn.close()
        return {"status": "SUCCESS"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database write fault: {str(e)}")


@app.get("/api/get-mocks")
async def get_mocks():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Fetch lists
    cursor.execute("SELECT id, author_name, role_type, topic, time_window, status, accepted_by FROM mock_interviews ORDER BY id DESC")
    rows = cursor.fetchall()
    
    # Calculate historical dashboard counters (Completed/Accepted mocks context tracker)
    cursor.execute("SELECT COUNT(*) FROM mock_interviews WHERE status = 'ACCEPTED'")
    accepted_count = cursor.fetchone()[0]
    conn.close()
    
    mocks_list = []
    for r in rows:
        mocks_list.append({
            "id": r[0], "author_name": r[1], "role_type": r[2], "topic": r[3], "time_window": r[4], "status": r[5], "accepted_by": r[6]
        })
    return {"mocks": mocks_list, "accepted_count": accepted_count}


@app.post("/api/accept-mock")
async def accept_mock(
    mock_id: int = Form(...),
    sender_name: str = Form(...),
    message: str = Form(...)
):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Identify target slot entity creator
    cursor.execute("SELECT author_name, role_type, topic FROM mock_interviews WHERE id = ?", (mock_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="Target schedule item log row entry not discovered.")
    
    target_author, role, topic = target
    
    # Update state flag variables
    cursor.execute("UPDATE mock_interviews SET status = 'ACCEPTED', accepted_by = ? WHERE id = ?", (sender_name, mock_id))
    
    # Generate structural notification text payload matching roles
    notif_msg = f"User {sender_name} accepted your {role} slot for '{topic}' and sent a message: \"{message}\""
    cursor.execute(
        "INSERT INTO notifications (target_name, sender_name, message) VALUES (?, ?, ?)",
        (target_author, sender_name, notif_msg)
    )
    
    conn.commit()
    conn.close()
    return {"status": "SUCCESS"}


# --- STREAMING CORE ALERTS ALIGNMENT ---
@app.get("/api/get-notifications")
async def get_notifications(username: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, sender_name, message, is_read FROM notifications WHERE target_name = ? AND is_read = 0 ORDER BY id DESC", (username,))
    rows = cursor.fetchall()
    conn.close()
    
    notifs = []
    for r in rows:
        notifs.append({"id": r[0], "sender": r[1], "message": r[2]})
    return {"notifications": notifs}


@app.post("/api/clear-notifications")
async def clear_notifications(username: str = Form(...)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE target_name = ?", (username,))
    conn.commit()
    conn.close()
    return {"status": "SUCCESS"}


# --- INGESTION VOICE INTERACTION PROCESSOR ---
@app.post("/api/process-audio")
async def process_voice_ingestion(
    audio_file: UploadFile = File(...), entry_type: str = Form(...), entry_title: str = Form(...)
):
    if not client: raise HTTPException(status_code=500, detail="GenAI context unavailable.")
    try:
        audio_bytes = await audio_file.read()
        if entry_type == "interview":
            prompt = f"Transcribe and convert this audio of a candidate describing an interview for '{entry_title}' into a clean markdown document with clear headings."
        else:
            prompt = f"Transcribe and convert this audio of an engineer explaining the project '{entry_title}' into a detailed technical system specification markdown document."

        audio_payload = types.Part.from_bytes(data=audio_bytes, mime_type="audio/webm")
        response = client.models.generate_content(model="gemini-2.5-flash", contents=[prompt, audio_payload])
        return {"status": "SUCCESS", "entry_title": entry_title, "processed_document": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)