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
    key = key.strip()
    model = os.getenv("MAXAI_MODEL", "claude-sonnet-4-20250514").strip()
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]})
        if r.status_code >= 400:
            # Surface Anthropic's actual error so failures are diagnosable
            raise RuntimeError(f"Anthropic {r.status_code} (model={model!r}): {r.text[:600]}")
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

def heuristic_meeting(title: str, text: str) -> dict:
    """Offline structured-minutes extractor: attendees, chair, decisions and
    actions pulled from the transcript with regex heuristics."""
    t = text or ""
    lines = [l.strip() for l in t.splitlines()]
    chair = ""
    mc = re.search(r"Chair:\s*(.+)", t)
    if mc:
        chair = mc.group(1).strip()[:60]
    attendees, cap = [], False
    for l in lines:
        if re.search(r"^\d*\.?\s*Attendees", l, re.I):
            cap = True
            continue
        if cap:
            if re.search(r"^(Apolog|\d*\.?\s*Purpose|\d+\.)", l, re.I) and not l.startswith(("•", "-", "*")):
                break
            mm = re.match(r"[•\-\*]\s*(.+)", l)
            if mm:
                name = re.sub(r"\(.*?\)", "", mm.group(1)).strip().strip(",")
                if name and len(name) < 60 and "as per distribution" not in name.lower():
                    attendees.append(name)
    decisions = []
    for l in lines:
        if re.search(r"\b(confirmed|agreed|approved|defined as|go-live|scheduled for|will commence|reduced from)\b", l, re.I):
            s = re.sub(r"^[•\-\*o\d\.\s]+", "", l).strip()
            if 12 <= len(s) <= 220 and s not in decisions:
                decisions.append(s)
    actions = []
    for m in re.finditer(r"\b(A\d{1,2})\b[\s:.\-]*([^\n]{6,170})", t):
        body = m.group(2).strip()
        actions.append({"ref": m.group(1), "text": body[:170], "owner": "", "due": "", "status": ""})
    if not actions:
        for l in lines:
            if re.match(r"[•\-\*]?\s*(Issue|Align|Ensure|Reinstate|Include|Engage|Capture|Finalise|Set up|Progress|Confirm|Review|Investigate)\b", l, re.I):
                actions.append({"ref": "", "text": re.sub(r"^[•\-\*\s]+", "", l)[:170], "owner": "", "due": "", "status": ""})
    sents = re.findall(r"[^.!?\n]+[.!?]", t)
    summary = (" ".join(sents[:2])[:300].strip()) if sents else title
    topics = [w for w in ["PILZ", "HBS", "Screening", "Commissioning", "Transfers", "Reclaim", "Go-live", "Mitigation", "Stand-down"] if w.lower() in t.lower()][:6]
    return {"summary": summary, "chair": chair, "attendees": attendees[:25],
            "decisions": decisions[:8], "actions": actions[:14], "topics": topics}


async def extract_meeting(title: str, transcript: str) -> dict:
    """Structured minutes from a meeting transcript — LLM when available, else
    the heuristic extractor."""
    if not ai_available():
        return heuristic_meeting(title, transcript)
    schema = ('{"summary":"3-4 sentence summary","topics":["t"],"chair":"name",'
              '"attendees":["name"],"decisions":["decision/agreement made"],'
              '"actions":[{"ref":"A1","text":"action","owner":"name","due":"YYYY-MM-DD or \'\'","status":"open|closed|\'\'"}]}')
    prompt = (UMP_DOMAIN + "\n\nYou are MAX. Extract structured minutes from this project meeting "
              "transcript: a concise summary, attendees, the chair, key decisions/agreements, and the "
              "action log (with owner, due date and status where stated). Return ONLY JSON matching: "
              + schema + "\n\nMeeting: " + title + "\nTranscript:\n" + (transcript or "")[:12000])
    try:
        raw = await ask(prompt, max_tokens=1500)
        m = re.search(r"\{[\s\S]*\}", raw)
        return json.loads(m.group(0)) if m else heuristic_meeting(title, transcript)
    except Exception:
        return heuristic_meeting(title, transcript)


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

async def ai_strategy(context: str, instruction: str | None = None) -> dict | None:
    """Ask Claude to synthesise a grounded mitigation strategy from project
    context (KPIs, risk register, bag-volume signals and ingested documents).
    ``instruction`` is an optional PM steer (e.g. "focus on HBS3 commissioning").
    Returns parsed JSON, or None so the caller can fall back to the engine."""
    if not ai_available():
        return None
    schema = ('{"narrative":"3-4 sentence executive summary",'
              '"objective":"1-2 sentence objective (protect passenger experience, maintain missed-bag performance vs baseline)",'
              '"mitigation_actions":[{"area":"area/zone","action":"short","mitigation":"what to do incl. staffing/flow diversions","responsibility":"team/role","priority":"critical|high|medium"}],'
              '"fmea":[{"process":"area/asset","failure_mode":"short","effect":"impact","severity":1-10,"controls":"control measure"}],'
              '"access_windows":[{"item":1,"area":"line/area","access":"24h (Sun 22:30-Fri 03:30)","start":"date","finish":"date","original_duration":"X wk","new_duration":"Y wk"}],'
              '"command_control":"go/no-go & coordination note","contingency":"contingency note",'
              '"predicted_risks":[{"title":"short","likelihood":1-5,"impact":1-5,"rationale":"why, grounded in the data"}],'
              '"todo":[{"text":"PM action","detail":"1 sentence","owner":"role","priority":"critical|high|medium"}]}')
    steer = f"\n\nPM INSTRUCTION (prioritise this): {instruction}" if instruction and instruction.strip() else ""
    prompt = (UMP_DOMAIN +
              "\n\nYou are MAX. Using ONLY the project context below (documents, lessons learned, "
              "bag-volume data, risk register, schedule), produce a Heathrow-style mitigation plan in the "
              "house format used for Pilz commissioning plans: an objective, an Area/Action/Mitigation/"
              "Responsibility action table (include flow diversions and staffing where known), an FMEA "
              "(Process/Failure Mode/Effect/Severity/Controls), command-and-control and contingency notes, "
              "predicted emerging risks, and a prioritised PM to-do list. Ground every point in the supplied "
              "data; cite document names where relevant. "
              "Return ONLY JSON matching: " + schema + steer + "\n\n=== PROJECT CONTEXT ===\n" + context[:11000])
    try:
        raw = await ask(prompt, max_tokens=2000)
        m = re.search(r"\{[\s\S]*\}", raw)
        return json.loads(m.group(0)) if m else None
    except Exception:
        return None
