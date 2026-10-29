from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import re
import asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="HemaSight Hybrid AI")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# Using the rolling alias to prevent 404s
MODEL = "gemini-flash-latest" 
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

LANGUAGES = {
    "en": "English", "hi": "Hindi", "te": "Telugu", "ta": "Tamil", 
    "kn": "Kannada", "es": "Spanish", "fr": "French"
}

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    language: str = "en"
    history: List[ChatMessage] = []

# ==========================================
# 1. LOCAL KNOWLEDGE BASE (RAG)
# ==========================================
KNOWLEDGE_BASE = [
    {
        "keywords": ["cancer", "tumor", "malignant", "oncology"],
        "content": "Cancer is a large group of diseases that can start in almost any organ or tissue of the body when abnormal cells grow uncontrollably. Leukemia is a type of cancer that affects the blood and bone marrow."
    },
    {
        "keywords": ["cbc", "wbc", "rbc", "hemoglobin", "platelet", "blood", "count", "normal", "range", "hematocrit"],
        "content": "A CBC measures blood components. Normal WBC is 4.5-11.0. High WBC may indicate infection or leukemia. Normal hemoglobin is 13.5-17.5 (men) or 12.0-15.5 (women). Low hemoglobin means anemia. Normal platelets are 150,000-400,000."
    },
    {
        "keywords": ["aml", "myeloid", "blast", "auer", "acute", "leukemia", "cd13", "cd33"],
        "content": "Acute myeloid leukemia (AML) is a cancer of the myeloid line. It features rapid growth of abnormal blasts. Diagnosis requires at least 20% blasts. Auer rods are specific to AML."
    },
    {
        "keywords": ["all", "lymphoblastic", "lymphoid", "childhood", "tdt", "cd19"],
        "content": "Acute lymphoblastic leukemia (ALL) is a malignant proliferation of lymphoid cells. It is the most common childhood cancer. Diagnosis requires 20% or more lymphoblasts."
    }
]

GREETING_KEYWORDS = ["hi", "hello", "hey", "namaste", "hola", "bonjour", "help", "start"]

# Local fallback greetings
GREETING_RESPONSES = {
    "en": "Hello! I am your HemaSight AI assistant. You can ask me about blood tests (CBC), leukemia (AML/ALL), or your recent results. How can I help you today?",
    "hi": "नमस्ते! मैं आपका HemaSight AI सहायक हूं। आप मुझसे रक्त परीक्षण (CBC), ल्यूकेमिया (AML/ALL), या अपने हालिया परिणामों के बारे में पूछ सकते हैं।",
    "te": "నమస్కారం! నేను మీ HemaSight AI సహాయకుడిని. మీరు రక్త పరీక్షలు (CBC), లుకీమియా (AML/ALL) గురించి అడగవచ్చు.",
    "ta": "வணக்கம்! நான் உங்கள் HemaSight AI உதவியாளர். இரத்த பரிசோதனைகள் (CBC), லுகேமியா (AML/ALL) பற்றி கேட்கலாம்.",
    "kn": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ HemaSight AI ಸಹಾಯಕ. ನೀವು ರಕ್ತ ಪರೀಕ್ಷೆಗಳು (CBC), ಲ್ಯುಕೇಮಿಯಾ (AML/ALL) ಬಗ್ಗೆ ಕೇಳಬಹುದು.",
    "es": "¡Hola! Soy tu asistente de HemaSight AI. Puedes preguntarme sobre análisis de sangre (CBC) o leucemia (LMA/LLA).",
    "fr": "Bonjour! Je suis votre assistant HemaSight AI. Vous pouvez me poser des questions sur les analyses de sang (CBC) ou la leucémie."
}

def tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r'\b[a-z]{2,}\b', text.lower())]

def detect_language(text: str) -> str:
    if re.search(r'[\u0900-\u097F]', text): return "hi"
    if re.search(r'[\u0C00-\u0C7F]', text): return "te"
    if re.search(r'[\u0B80-\u0BFF]', text): return "ta"
    if re.search(r'[\u0C80-\u0CFF]', text): return "kn"
    return "en"

def is_greeting(text: str) -> bool:
    text = text.lower().strip()
    words = text.split()
    if len(words) <= 3 and any(greet in words for greet in GREETING_KEYWORDS):
        return True
    return text in GREETING_KEYWORDS

def retrieve_context(question: str) -> str:
    q_tokens = set(tokenize(question))
    best_doc = None
    best_score = 0
    
    for doc in KNOWLEDGE_BASE:
        keyword_overlap = len(q_tokens & set(doc["keywords"]))
        content_overlap = len(q_tokens & set(tokenize(doc["content"])))
        score = (keyword_overlap * 2) + content_overlap
        
        if score > best_score:
            best_score = score
            best_doc = doc

    if best_score > 0 and best_doc:
        return best_doc["content"]
    return ""

# ==========================================
# 2. API ENDPOINT (HYBRID LOGIC)
# ==========================================

@app.post("/chat")
async def chat(req: ChatRequest):
    lang = req.language
    if lang not in LANGUAGES:
        lang = detect_language(req.message)
        
    lang_name = LANGUAGES.get(lang, "English")

    # Step 1: Retrieve context from local KB
    retrieved_context = retrieve_context(req.message)
    
    patient_ctx = f"\nPatient Data: {req.context}" if req.context else ""
    
    history_text = ""
    if req.history:
        history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in req.history[-5:]])
        history_text = f"\nRecent Conversation:\n{history_text}"

    # Step 2: Build the Prompt for Gemini
    system_prompt = f"""You are HemaSight AI, a helpful and empathetic medical assistant.
The user has selected the language: {lang_name}.
You MUST respond entirely in {lang_name}. Do not mix English.
If the user greets you, greet them back warmly.
Use the provided FACTUAL CONTEXT to inform your answer.
Never diagnose. Always suggest consulting a doctor.
Keep replies under 150 words.

FACTUAL CONTEXT:
{retrieved_context if retrieved_context else "No specific clinical context found. Rely on your general medical knowledge."}
{patient_ctx}
{history_text}
"""

    full_prompt = f"{system_prompt}\n\nPatient: {req.message}"

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {"maxOutputTokens": 300, "temperature": 0.7},
    }

    gemini_failed = False

    # Step 3: Try Gemini with 1 Retry
    if GEMINI_API_KEY and not is_greeting(req.message): 
        # (We let local handle greetings instantly to save API calls and improve speed)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(f"{API_URL}?key={GEMINI_API_KEY}", json=payload)
                
                if r.status_code == 200:
                    data = r.json()
                    reply = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {
                        "reply": reply.strip(),
                        "language": lang,
                        "language_name": lang_name,
                        "model_used": MODEL
                    }
                else:
                    print(f"Gemini returned {r.status_code}. Switching to Local RAG.")
                    gemini_failed = True
        except Exception as e:
            print(f"Gemini connection failed: {e}. Switching to Local RAG.")
            gemini_failed = True
    else:
        gemini_failed = True # Skip Gemini for greetings or if key is missing

    # ==========================================
    # STEP 4: LOCAL RAG FALLBACK (If Gemini fails)
    # ==========================================
    if gemini_failed:
        if is_greeting(req.message):
            reply = GREETING_RESPONSES.get(lang, GREETING_RESPONSES["en"])
            model_used = "Local-Greeting"
        elif retrieved_context:
            # We provide the English medical fact with a localized wrapper
            # This ensures the user doesn't get a blank error screen
            fallbacks = {
                "en": f"Based on medical guidelines: {retrieved_context} Please consult your doctor.",
                "hi": f"चिकित्सा दिशानिर्देशों के आधार पर: {retrieved_context} कृपया अपने डॉक्टर से परामर्श लें।",
                "te": f"వైద్య మార్గదర్శకాల ఆధారంగా: {retrieved_context} దయచేసి మీ వైద్యుడిని సంప్రదించండి.",
                "ta": f"மருத்துவ வழிகாட்டுதல்களின் அடிப்படையில்: {retrieved_context} மருத்துவரை அணுகவும்.",
                "kn": f"ವೈದ್ಯಕೀಯ ಮಾರ್ಗಸೂಚಿಗಳ ಆಧಾರದ ಮೇಲೆ: {retrieved_context} ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
                "es": f"Según las guías médicas: {retrieved_context} Consulte a su médico.",
                "fr": f"Selon les directives médicales: {retrieved_context} Consultez votre médecin."
            }
            reply = fallbacks.get(lang, fallbacks["en"])
            model_used = "Local-RAG"
        else:
            fallbacks = {
                "en": "I could not find specific medical information for your query. Please try again or consult your doctor.",
                "hi": "मुझे इसका उत्तर नहीं मिला। कृपया पुनः प्रयास करें या डॉक्टर से सलाह लें।",
                "te": "నాకు సమాధానం దొరకలేదు. దయచేసి మళ్లీ ప్రయత్నించండి లేదా వైద్యుడిని సంప్రదించండి.",
                "ta": "எனக்கு பதில் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது மருத்துவரை அணுகவும்.",
                "kn": "ನನಗೆ ಉತ್ತರ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
                "es": "No pude encontrar información específica. Inténtelo de nuevo o consulte a su médico.",
                "fr": "Je n'ai pas trouvé d'information. Réessayez ou consultez votre médecin."
            }
            reply = fallbacks.get(lang, fallbacks["en"])
            model_used = "Local-RAG"

        return {
            "reply": reply,
            "language": lang,
            "language_name": lang_name,
            "context_found": bool(retrieved_context),
            "model_used": model_used
        }