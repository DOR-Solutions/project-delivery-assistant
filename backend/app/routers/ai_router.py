from fastapi import APIRouter
from .. import ai
from ..schemas import ChatIn

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/status")
def status():
    return {"available": ai.ai_available()}

@router.post("/chat")
async def chat(body: ChatIn):
    if not ai.ai_available():
        return {"reply": "AI is not configured on the server. Set MAXAI_ANTHROPIC_KEY to enable live chat.", "ai": False}
    convo = "\n".join(f"{m.get('role','user').upper()}: {m.get('text','')}" for m in body.history[-8:])
    prompt = f"{ai.UMP_DOMAIN}\n\nYou are MAX AI. Answer concisely (2-5 sentences).\n\n{convo}\nUSER: {body.message}\nMAX:"
    try:
        reply = await ai.ask(prompt, max_tokens=800)
        return {"reply": reply.strip(), "ai": True}
    except Exception as e:
        return {"reply": f"AI error: {e}", "ai": False}
