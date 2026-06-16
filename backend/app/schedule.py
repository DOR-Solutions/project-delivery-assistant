"""Look-ahead schedule data (P6-style), seeded for demo.

Each activity mirrors the columns VI reviews in the 6-week look-ahead:
% complete, start/finish vs baseline finish, total float, discipline and WBS.
Real ingestion (P6 Excel/XER export) can replace get_lookahead() later.
"""
from __future__ import annotations
from datetime import date, timedelta

# T5 PILZ — modelled on the live "6 week lookahead, < 100%" layout.
T5_ACTIVITIES = [
    {"id": "A58760", "name": "Staff Check-in Commissioning – HAL Proposal Review", "wbs": "Staff Check-in Commissioning", "discipline": "COM", "pct": 0, "remaining": 5, "start": "2026-06-22", "finish": "2026-06-26", "bl_finish": "2026-05-26", "total_float": 253, "preds": ["A58750 (FS)"], "succs": []},
    {"id": "A24610", "name": "Remove existing Emergency Stop & Cable – CIA 0001", "wbs": "Existing E-stop & Cable Removal – CIA 0001", "discipline": "CON", "pct": 87, "remaining": 0, "start": "2026-05-27", "finish": "2026-06-22", "bl_finish": "2026-06-04", "total_float": 72, "preds": [], "succs": ["T2_73330 (FS)"]},
    {"id": "PLC0021", "name": "PLC controls integration – 0021/0040", "wbs": "Commissioning – HBS3", "discipline": "COM", "pct": 20, "remaining": 16, "start": "2026-06-16", "finish": "2026-07-10", "bl_finish": "2026-06-30", "total_float": -5, "preds": ["A24610 (FS)"], "succs": []},
    {"id": "FA0064", "name": "Fire-alarm interface mobilisation (Honeywell)", "wbs": "Commissioning – HBS1/2", "discipline": "COM", "pct": 0, "remaining": 18, "start": "2026-06-22", "finish": "2026-07-15", "bl_finish": "2026-07-01", "total_float": -3, "preds": [], "succs": []},
    {"id": "T2_73330", "name": "Batch 3: HAL Review – CIA 0005", "wbs": "BIU Documentation – CIA 0005", "discipline": "DOC", "pct": 0, "remaining": 5, "start": "2026-06-23", "finish": "2026-06-29", "bl_finish": "2026-06-22", "total_float": 167, "preds": ["T2_73760 (FS)"], "succs": ["T2_73770 (FS)"]},
    {"id": "T2_73770", "name": "BAB5 achieved – CIA 0005", "wbs": "BIU Documentation – CIA 0005", "discipline": "DOC", "pct": 0, "remaining": 0, "start": "2026-06-29", "finish": "2026-06-29", "bl_finish": "2026-06-22", "total_float": 167, "preds": ["T2_73330 (FS)"], "succs": []},
    {"id": "T2_73120", "name": "Batch 3: HAL Review – CIA 0001", "wbs": "BIU Documentation – CIA 0001", "discipline": "DOC", "pct": 0, "remaining": 5, "start": "2026-06-23", "finish": "2026-06-29", "bl_finish": "2026-06-22", "total_float": 165, "preds": [], "succs": []},
    {"id": "T2_73710", "name": "BAB5 achieved – CIA 0001", "wbs": "BIU Documentation – CIA 0001", "discipline": "DOC", "pct": 0, "remaining": 0, "start": "2026-06-29", "finish": "2026-06-29", "bl_finish": "2026-06-22", "total_float": 165, "preds": ["T2_73120 (FS)"], "succs": []},
    {"id": "T2_73540", "name": "Batch 3: HAL Review – BTA 0025", "wbs": "Go Live 5 – BTA 0025", "discipline": "DOC", "pct": 0, "remaining": 5, "start": "2026-06-29", "finish": "2026-07-03", "bl_finish": "2026-06-17", "total_float": 147, "preds": [], "succs": ["T2_73830 (FS)"]},
    {"id": "T2_73830", "name": "BAB5 achieved – BTA 0025", "wbs": "Go Live 5 – BTA 0025", "discipline": "DOC", "pct": 0, "remaining": 0, "start": "2026-07-03", "finish": "2026-07-03", "bl_finish": "2026-06-17", "total_float": 147, "preds": ["T2_73540 (FS)"], "succs": []},
    {"id": "A51350", "name": "HAL issue All COC Certificate – CIA 0005", "wbs": "All CoC – CIA 0005", "discipline": "DOC", "pct": 0, "remaining": 10, "start": "2026-07-22", "finish": "2026-08-06", "bl_finish": "2026-08-06", "total_float": 167, "preds": [], "succs": []},
    {"id": "GL6_HPA", "name": "Go Live 6 – HPA 0022 area milestone", "wbs": "Go Live 6 – HPA 0023/0022/0020", "discipline": "COM", "pct": 0, "remaining": 14, "start": "2026-07-02", "finish": "2026-07-20", "bl_finish": "2026-05-20", "total_float": 9, "preds": [], "succs": []},
]

DISCIPLINES = {"COM": "Commissioning", "CON": "Construction", "DOC": "Documentation"}


def _generated(meta: dict) -> list[dict]:
    """Lightweight look-ahead for non-T5 projects, derived from workstreams."""
    acts = []
    base = date(2026, 6, 16)
    for i, w in enumerate(meta.get("workstreams", [])):
        start = base + timedelta(days=10 * i)
        finish = start + timedelta(days=12 + i * 4)
        # lower-progress workstreams slip vs baseline
        slip = 0 if w["pct"] >= 75 else (10 if w["pct"] >= 45 else 18)
        bl_finish = finish - timedelta(days=slip)
        tf = 30 - i * 18  # later workstreams tighten toward / below zero float
        acts.append({
            "id": f"WS{i+1:02d}", "name": f"{w['name']} – delivery", "wbs": w["name"],
            "discipline": "COM" if "commiss" in w["name"].lower() else "CON" if i == 0 else "DOC",
            "pct": w["pct"], "remaining": max(0, 20 - round(w["pct"] / 6)),
            "start": start.isoformat(), "finish": finish.isoformat(), "bl_finish": bl_finish.isoformat(),
            "total_float": tf, "preds": [], "succs": [],
        })
    return acts


def get_lookahead(pid: str, meta: dict | None = None) -> list[dict]:
    if pid == "t5-baggage-programme":
        return T5_ACTIVITIES
    return _generated(meta or {})
