from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
from dotenv import load_dotenv

# Load .env file (GEMINI_API_KEY must be inside .env)
load_dotenv()

app = FastAPI(title="HemaSight Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"

LANGUAGE_CONFIG = {
    "en": {"name": "English", "instruction": "Respond ONLY in English."},
    "hi": {"name": "Hindi", "instruction": "केवल हिन्दी में उत्तर दें।"},
    "te": {"name": "Telugu", "instruction": "తెలుగులో మాత్రమే సమాధానం ఇవ్వండి."},
    "ta": {"name": "Tamil", "instruction": "தமிழில் மட்டும் பதிலளிக்கவும்."},
    "kn": {"name": "Kannada", "instruction": "ಕನ್ನಡದಲ್ಲಿ ಮಾತ್ರ ಉತ್ತರಿಸಿ."},
    "es": {"name": "Spanish", "instruction": "Responde SOLO en español."},
    "fr": {"name": "French", "instruction": "Répondez UNIQUEMENT en français."},
}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    language: str = "en"
    history: List[ChatMessage] = []


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "HemaSight Chatbot",
        "key_configured": bool(GEMINI_API_KEY),
        "supported_languages": list(LANGUAGE_CONFIG.keys()),
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(503, "GEMINI_API_KEY not set")

    lang = LANGUAGE_CONFIG.get(req.language, LANGUAGE_CONFIG["en"])
    lang_name = lang["name"]
    lang_instruction = lang["instruction"]

    system_prompt = f"""You are HemaSight AI, a compassionate medical assistant.

CRITICAL LANGUAGE RULE:
- The patient has selected {lang_name}.
- {lang_instruction}
- You MUST respond in {lang_name} only.
- Do NOT switch languages even if the user writes in another language.

MEDICAL RULES:
- Explain leukemia blood test results in SIMPLE, non-technical language.
- Never diagnose. Always suggest consulting a doctor.
- Use short sentences and everyday analogies.
- If risk is high, stay calm but emphasize urgency.
- End every reply with a short encouraging note.
- Do NOT use markdown formatting (no **, no #, no bullet symbols)."""

    ctx = ""
    if req.context:
        ctx = f"\n\nPatient's latest analysis:\n{req.context}\n"

    full_prompt = f"{system_prompt}{ctx}\n\nPatient asks: {req.message}"

    payload = {"contents": [{"parts": [{"text": full_prompt}]}]}

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
        if r.status_code != 200:
            raise HTTPException(r.status_code, r.text)
        data = r.json()

    try:
        reply = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        reply = "Sorry, I couldn't process that. Please try again."

    return {"reply": reply, "language": req.language, "language_name": lang_name}