import json
import os

_HERE = os.path.dirname(__file__)
MODEL = json.load(open(os.path.join(_HERE, "t5_bhs_model.json")))

TOTAL_PEAK = MODEL["meta"]["total_plan"]
DAY_FACTOR = {"A": 1.0, "B": 0.90, "C": 0.80}
MIP, PORTER, OOG_CAP = 2900, 600, 800
HBS = {h["id"]: h for h in MODEL["hbs"]}


def band(score):
    return "critical" if score >= 15 else "high" if score >= 9 else "medium" if score >= 4 else "low"


def _hbs_spare(recv_id, factor):
    h = HBS[recv_id]
    load = h["share"] * TOTAL_PEAK * factor
    design = h["share"] * TOTAL_PEAK / 0.85
    return max(0, round(design - load))


def _ebs(at_risk):
    return round(0.30 * at_risk)


PLAYBOOK = {
    "HBS_1_2": [
        "Cross-screen Zone A/B flow to HBS 3 (spare only)",
        "Open all Zone A/B MIPs + FOH porterage (~2,900/day)",
        "Buffer non-critical bags to Early Bag Store",
        "Protect time-critical / short-connection bags first",
        "If residual remains: invoke check-in throttle / flight holds (Duty Mgr + airline)",
    ],
    "HBS_3": [
        "Cross-screen Concourse C/B flow to HBS 1/2 and HBS 1/3 (spare only)",
        "Open Zone C + late-bag MIPs; hand-load PBA overflow",
        "Buffer late bags to Early Bag Store",
        "Protect problem-bag and late-bag flows first",
    ],
    "HBS_1_3": [
        "Hold transfer bags in EBS / TBS dump buffer",
        "MIP-inject short-connection transfers to make-up",
        "FOH porterage for tightest connections",
        "Re-time non-urgent transfers with allocation desk",
    ],
    "OOG_HBS": ["Divert to manual-search lane; MIP-inject to make-up"],
}


def _ci_play(node):
    return [
        "Re-accept passengers at adjacent desks (same HBS)",
        "Open zone MIPs to clear collector belt",
        "Overflow to interline/late-bag acceptance",
        "Throttle only if a screening constraint coincides",
    ]


def _tx_play(node):
    return [
        "Re-route to adjacent transfer line into HBS 1/3",
        "Buffer to Early Bag Store; MIP short connections",
        "Porterage for tightest connections only",
    ]


def _node_index():
    idx = {}
    for h in MODEL["hbs"]:
        idx[h["id"]] = ("HBS", h)
    for c in MODEL["checkin"]:
        idx[c["id"]] = ("CHECK-IN", c)
    for t in MODEL["transfer"]:
        idx[t["id"]] = ("TRANSFER", t)
    return idx


def assess_outage(node_id, day_type="A", total=None, availability=0.0):
    typ, nd = _node_index()[node_id]
    factor = DAY_FACTOR.get(day_type, 1.0)
    total = total or round(TOTAL_PEAK * factor)
    lost_frac = 1.0 - max(0.0, min(1.0, availability))
    at_risk = round(nd["share"] * total * lost_frac)

    detail, cap = [], 0
    if typ == "HBS":
        for rid in nd.get("cross_to", []):
            sp = _hbs_spare(rid, factor)
            if sp > 0:
                cap += sp
                detail.append(f"Cross-screen -> {HBS[rid]['name']}: {sp:,}")
        cap += MIP
        detail.append(f"Manual injection (MIP): {MIP:,}")
        e = _ebs(at_risk)
        cap += e
        detail.append(f"Early Bag Store (same-day): {e:,}")
        if node_id == "HBS_1_3":
            cap += PORTER
            detail.append(f"FOH porterage: {PORTER:,}")
        play = PLAYBOOK.get(node_id, [])
    elif typ == "TRANSFER":
        e = _ebs(at_risk)
        cap = MIP + e + PORTER
        detail = [f"Manual injection (MIP): {MIP:,}", f"Early Bag Store: {e:,}", f"FOH porterage: {PORTER:,}"]
        play = _tx_play(nd)
    else:
        re = round(0.5 * at_risk)
        cap = re + MIP
        detail = [f"Re-accept at adjacent zone: {re:,}", f"Manual injection (MIP): {MIP:,}"]
        play = _ci_play(nd)

    residual = max(0, at_risk - cap)
    pct = residual / at_risk if at_risk else 0
    like = 3 if typ == "HBS" else 2
    imp = 5 if pct >= 0.4 else 4 if pct >= 0.15 else 3 if pct > 0 else 2
    score = like * imp
    return {
        "node": nd["name"],
        "node_id": node_id,
        "type": typ,
        "day_type": day_type,
        "total_forecast": total,
        "bags_at_risk": at_risk,
        "mitigation_capacity": cap,
        "mitigation_detail": detail,
        "residual_unhandled": residual,
        "residual_pct": round(pct * 100),
        "risk_score": score,
        "band": band(score),
        "playbook": play,
    }


def impact_table(day_type="A", total=None):
    return [assess_outage(nid, day_type, total, availability=0.0) for nid in _node_index()]


def day_forecast(day_type):
    return round(TOTAL_PEAK * DAY_FACTOR.get(day_type, 1.0))
