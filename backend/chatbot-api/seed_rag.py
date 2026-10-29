import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Verified medical facts for the RAG database
KNOWLEDGE_BASE = [
    "Leukemia is a type of cancer found in your blood and bone marrow, caused by the rapid production of abnormal white blood cells.",
    "A normal WBC (White Blood Cell) count is typically between 4,500 and 11,000 white blood cells per microliter of blood.",
    "Blast percentage measures immature white blood cells. In a healthy person, blasts are usually less than 5% of total cells.",
    "A high blast percentage (over 20%) is a key indicator of acute leukemias like AML (Acute Myeloid Leukemia) or ALL (Acute Lymphoblastic Leukemia).",
    "Chemotherapy is a common treatment for leukemia that uses drugs to stop the growth of cancer cells.",
    "GVHD stands for Graft-versus-host disease. It is a condition where donated bone marrow cells attack the patient's body.",
    "Chimerism testing measures the percentage of donor cells in the patient's blood after a transplant. A higher percentage (closer to 100%) means the transplant is successful.",
    "Relapse in leukemia means the cancer has returned after a period of remission. It is often detected by rising blast counts or decreasing donor chimerism.",
    "SGOT (AST) and SGPT (ALT) are liver enzymes. Elevated levels in leukemia patients can indicate liver stress from medication or GVHD."
]

async def get_embedding(text):
    # Using the current gemini-embedding-001 model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    payload = {"model": "models/gemini-embedding-001", "content": {"parts": [{"text": text}]}}
    
    async with httpx.AsyncClient() as client:
        r = await client.post(url, json=payload)
        if r.status_code != 200:
            print(f"API Error: {r.text}")
            raise Exception("Failed to get embedding")
        return r.json()["embedding"]["values"]

async def main():
    print("Seeding knowledge base...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        return

    async with httpx.AsyncClient() as client:
        for text in KNOWLEDGE_BASE:
            try:
                emb = await get_embedding(text)
                
                headers = {
                    "apikey": SUPABASE_KEY, 
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                }
                payload = {"content": text, "embedding": emb}
                
                r = await client.post(f"{SUPABASE_URL}/rest/v1/chatbot_knowledge", headers=headers, json=payload)
                if r.status_code in [200, 201]:
                    print(f"✅ Inserted: {text[:40]}...")
                else:
                    print(f"❌ Failed: {r.text}")
            except Exception as e:
                print(f"Error processing: {text[:30]}... - {e}")

if __name__ == "__main__":
    asyncio.run(main())