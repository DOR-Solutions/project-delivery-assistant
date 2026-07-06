from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import ai, retrieval
from ..schemas import ChatIn

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status")
def status():
    # Ask MAX always answers (grounded retrieval); live=True means full LLM is on.
    return {"available": ai.ai_available(), "grounded": True}


@router.post("/chat")
async def chat(body: ChatIn, db: Session = Depends(get_db)):
    # Ground every answer in the project's documents + live data.
    context, sources = retrieval.context_block(db, body.project_id, body.message)

    if ai.ai_available():
        convo = "\n".join(f"{m.get('role','user').upper()}: {m.get('text','')}" for m in body.history[-6:])
        prompt = (
            ai.UMP_DOMAIN +
            "\n\nYou are MAX. Answer the user's question using ONLY the context below (live project data and "
            "ingested documents). Be concise (2–6 sentences) and cite the source in [brackets]. If the answer "
            "isn't in the context, say so plainly.\n\n=== CONTEXT ===\n" + context +
            "\n\n" + convo + f"\nUSER: {body.message}\nMAX:"
        )
        try:
            reply = await ai.ask(prompt, max_tokens=800)
            return {"reply": reply.strip(), "ai": True, "sources": sources}
        except Exception:
            pass  # e.g. no credit — fall back to deterministic grounded answer

    reply, det_sources = retrieval.answer_text(db, body.project_id, body.message)
    return {"reply": reply, "ai": False, "sources": sources or det_sources}
