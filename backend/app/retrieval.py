"""Retrieval grounding for Ask MAX.

Searches the project's ingested documents and live data (KPIs, risks, budget,
resources, look-ahead) so the assistant answers from real source material —
deterministically when there's no LLM, and as grounding context when there is.
"""
from __future__ import annotations
import re

from . import models, portfolio, engine, schedule as schedule_mod

STOP = set((
    "the a an and or of to in on for with is are was were be been at by from as it this that these those "
    "we you our your their they them his her its will shall can could should would may might do does did "
    "have has had not no if then than into per via what when where which who whom how why any all"
).split())


def _kw(s: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(w) > 2 and w not in STOP]


def _facts(db, pid: str) -> list[tuple[str, str]]:
    facts: list[tuple[str, str]] = []
    ops = portfolio.get_ops(pid)
    meta = portfolio.PROJECTS_META.get(pid, {})
    completion = int(meta.get("completion", 0))
    if ops:
        comp = engine.compute_ops(ops)
        health = engine.health_for(completion, comp["critical"], comp["open_high"])
        gates = engine.gate_progress(meta.get("current_gate", "G0"), completion)
        facts.append((f"{meta.get('name')} is {completion}% complete, health {health['label']}, utilisation "
                      f"{comp['util_pct']}%, plan adherence {comp['adhere_pct']}%. Open high risks {comp['open_high']}, "
                      f"critical {comp['critical']}. Current gate {gates['current']}, next {gates['next']} "
                      f"({gates['next_label']}).", "project KPIs"))
        for r in comp["risks"][:8]:
            facts.append((f"Risk [{r['band']} {r['score']}] in {r.get('area','')}: {r['title']}. "
                          f"Mitigation: {r.get('mitigation','')}. Owner: {r.get('owner','')}.", "risk register"))
    b = portfolio.get_budget(pid)
    if b:
        bd = engine.compute_budget(b, completion)
        facts.append((f"Budget {bd['currency']}{bd['bac']:,}, spent {bd['currency']}{bd['ac']:,} ({bd['pct_spent']}%), "
                      f"forecast out-turn {bd['currency']}{bd['eac']:,} — {bd['verdict']} (CPI {bd['cpi']}).", "budget"))
        for s in bd["suppliers"]:
            facts.append((f"Supplier {s['name']}: budget {bd['currency']}{s['budget']:,}, spent "
                          f"{bd['currency']}{s['spent']:,} ({s['pct_spent']}%).", "budget"))
    res = portfolio.get_resources(pid)
    if res:
        rr = engine.compute_resources(res, 1)
        facts.append((f"Resourcing: {rr['headcount']} people across {rr['suppliers']} suppliers, "
                      f"{rr['currency']}{rr['daily_cost']:,}/day.", "resources"))
        for s in rr["by_supplier"]:
            facts.append((f"{s['supplier']}: {s['headcount']} people — {', '.join(s['roles'])} — "
                          f"{rr['currency']}{s['daily_cost']:,}/day.", "resources"))
    la = engine.compute_lookahead(schedule_mod.get_lookahead(pid, meta))
    sm = la["summary"]
    facts.append((f"Look-ahead ({sm['weeks']}wk window): {sm['total']} activities, {sm['critical']} critical-path, "
                  f"{sm['slipping']} slipping; worst {abs(sm['worst_variance'])}d behind baseline.", "look-ahead schedule"))
    for a in la["activities"][:6]:
        facts.append((f"Activity {a['id']} ({a['discipline']}): {a['name']} — {a['pct']}% complete, finish {a['finish']}, "
                      f"float {a['total_float']}, variance {a['variance_days']}d, {a['status']}.", "look-ahead schedule"))
    return facts


def _doc_passages(db, pid: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for d in db.query(models.Document).filter(models.Document.project_id == pid).all():
        if d.summary:
            out.append((d.summary, d.name))
        chunks = re.split(r"(?<=[.!?])\s+|\n+", d.text or "")
        buf = ""
        for ch in chunks:
            ch = ch.strip()
            if not ch:
                continue
            buf = (buf + " " + ch).strip()
            if len(buf) >= 120:
                out.append((buf[:400], d.name)); buf = ""
                if len([p for p in out if p[1] == d.name]) > 400:
                    break
        if buf:
            out.append((buf[:400], d.name))
    return out


def search(db, pid: str, question: str, k: int = 10):
    qk = set(_kw(question))
    corpus = _facts(db, pid) + _doc_passages(db, pid)
    scored = []
    for text, src in corpus:
        tk = _kw(text)
        if not tk:
            continue
        overlap = sum(1 for w in set(tk) if w in qk)
        if overlap == 0:
            continue
        scored.append((overlap / (1 + len(tk) ** 0.5), text, src))
    scored.sort(key=lambda x: -x[0])
    top = scored[:k]
    sources: list[str] = []
    for _, _, s in top:
        if s not in sources:
            sources.append(s)
    return top, sources


def answer_text(db, pid: str, question: str):
    top, sources = search(db, pid, question, k=6)
    if not top:
        return ("I couldn't find that in the current project data or documents. Try rephrasing, or add the "
                "relevant file in the Ingest tab.", [])
    lines = ["Here's what I found across the project data and documents:", ""]
    for _, text, src in top:
        lines.append(f"• {text}  (source: {src})")
    return "\n".join(lines), sources


def context_block(db, pid: str, question: str):
    top, sources = search(db, pid, question, k=12)
    block = "\n".join(f"[{src}] {text}" for _, text, src in top)
    return block, sources
