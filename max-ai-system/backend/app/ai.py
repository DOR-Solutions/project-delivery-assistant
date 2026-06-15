"""AI layer — proxies to Anthropic when MAXAI_ANTHROPIC_KEY is set, else
falls back to a deterministic keyword extractor so the system runs offline."""
import os, json, re
import httpx

UMP_DOMAIN = (
    "You operate within the LHR Unified Mitigation Plan (UMP) framework at Heathrow. "
    "Pillars: Centralised Governance, Integrated Resource Pool, Automated Intelligence. "
    "Gates G0-G8. Vocabulary: CCM, FBC/OBC, RAG, BHS, Maximo, T2/T3/T4/T5, PILZ, OOG, HBS."
)

def ai_available() -> bool:
    return bool(os.getenv("MAXAI_ANTHROPIC_KEY"))

async def ask(prompt: str, max_tokens: int = 1500) -> str:
    key = os.getenv("MAXAI_ANTHROPIC_KEY")
    if not key:
        raise RuntimeError("No AI key configured")
    model = os.getenv("MAXAI_MODEL", "claude-sonnet-4-20250514")
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]})
        r.raise_for_status()
        data = r.json()
        return "".join(c["text"] for c in data["content"] if c["type"] == "text")

def heuristic_extract(name: str, text: str) -> dict:
    t = text[:10000]
    insights = []
    for m in list(re.finditer(r"\b(risk|delay|issue|concern|blocker)\b[^.!?\n]{8,140}[.!?]", t, re.I))[:3]:
        insights.append({"type": "risk", "title": m.group(0)[:60].strip() + "…", "detail": m.group(0).strip()[:180], "source": name})
    for m in list(re.finditer(r"\b(must|need to|required|action|complete|finalise)\b[^.!?\n]{8,140}[.!?]", t, re.I))[:3]:
        insights.append({"type": "action", "title": m.group(0)[:60].strip() + "…", "detail": m.group(0).strip()[:180], "source": name})
    sents = re.findall(r"[^.!?]+[.!?]", t)
    return {
        "summary": (" ".join(sents[:2])[:280].strip()) if sents else f"{name} ingested.",
        "topics": [name.rsplit(".", 1)[0]],
        "insights": insights or [{"type": "action", "title": f"Review {name}", "detail": "Manual review recommended.", "source": name}],
    }

async def extract_insights(name: str, text: str) -> dict:
    if not ai_available():
        return heuristic_extract(name, text)
    schema = ('{"summary":"2-3 sentences","topics":["t"],"insights":'
              '[{"type":"risk|action|decision|date|metric|contact","title":"short",'
              '"detail":"1 sentence","source":"%s"}]}' % name)
    prompt = (UMP_DOMAIN + "\n\nAnalyse this project document. Return ONLY JSON: "
              + schema + "\n\nFilename: " + name + "\nContent:\n" + text[:9000])
    try:
        raw = await ask(prompt)
        m = re.search(r"\{[\s\S]*\}", raw)
        return json.loads(m.group(0)) if m else heuristic_extract(name, text)
    except Exception:
        return heuristic_extract(name, text)
