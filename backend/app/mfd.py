"""Multi-terminal Material Flow Diagram (MFD) model + bag-flow loss simulation.

Each *system* is a baggage flow (T5, T3 InterBag, PT5 TBS) made of nodes
(lines) with a capacity, status, processing stage and a functional `kind`.
Mitigation playbooks and resource requirements default from the node kind and
can be overridden per node. The simulator projects the loss of one OR several
lines at once: lost throughput, how much parallel lines can absorb, residual
backlog at risk, downstream impact, mitigation and resources required.
"""
from copy import deepcopy

# ---------- mitigation / resource defaults by functional kind ----------
KIND_DEFAULTS = {
    "feed": {"recovery_min": 60, "mitigation": [
        "Hold flights / throttle acceptance to match downstream capacity",
        "Open additional manual bag-drop and oversize desks",
        "Re-allocate check-in desks to unaffected zones"],
        "resources": [{"item": "Baggage operatives (porters)", "qty": 6, "type": "people"},
                      {"item": "Check-in agents", "qty": 4, "type": "people"},
                      {"item": "Maintenance engineer", "qty": 1, "type": "engineer"},
                      {"item": "Tugs + dollies", "qty": 2, "type": "equipment"}]},
    "screening": {"recovery_min": 90, "mitigation": [
        "Cross-feed flow to parallel screening lines via the inter-machine sorter",
        "Open manual search positions (MIP) to clear the screening backlog",
        "Throttle check-in acceptance and hold latest-bag flights",
        "Deploy porters to hand-carry cleared bags to make-up"],
        "resources": [{"item": "Baggage operatives (porters)", "qty": 8, "type": "people"},
                      {"item": "MIP search agents", "qty": 4, "type": "people"},
                      {"item": "Maintenance engineer", "qty": 2, "type": "engineer"},
                      {"item": "Tugs + dollies", "qty": 6, "type": "equipment"}]},
    "store": {"recovery_min": 75, "mitigation": [
        "Switch early-bag store to bypass / direct-to-make-up routing",
        "Buffer bags in track-transit pending restore; prioritise time-critical",
        "Manual store and re-inject of bags at the store heads"],
        "resources": [{"item": "Baggage operatives (porters)", "qty": 6, "type": "people"},
                      {"item": "Store / TTS controller", "qty": 1, "type": "people"},
                      {"item": "Maintenance engineer", "qty": 2, "type": "engineer"},
                      {"item": "Tugs + dollies", "qty": 4, "type": "equipment"}]},
    "buffer": {"recovery_min": 45, "mitigation": [
        "Switch to manual cart supply from the standby cart pool",
        "Re-balance empty carts from adjacent make-up halls",
        "Manual bag build where carts are unavailable"],
        "resources": [{"item": "Cart handlers", "qty": 5, "type": "people"},
                      {"item": "Dispatch coordinator", "qty": 1, "type": "people"},
                      {"item": "Maintenance engineer", "qty": 1, "type": "engineer"},
                      {"item": "Tugs + dollies", "qty": 4, "type": "equipment"}]},
    "transport": {"recovery_min": 60, "mitigation": [
        "Switch inter-terminal bags to road transfer (tug & dolly)",
        "Hold connecting bags in buffer; re-sequence by connection time",
        "Coordinate with the receiving terminal on late bags"],
        "resources": [{"item": "Transfer drivers", "qty": 6, "type": "people"},
                      {"item": "Transfer coordinator", "qty": 2, "type": "people"},
                      {"item": "Maintenance engineer", "qty": 2, "type": "engineer"},
                      {"item": "Tugs + dollies", "qty": 8, "type": "equipment"}]},
    "makeup": {"recovery_min": 120, "mitigation": [
        "Open remote / standby make-up laterals and re-allocate flights",
        "Manual bag build at carousel heads with extra ground crew",
        "Porter time-critical bags directly to aircraft stands",
        "Re-sequence make-up by departure time with airlines"],
        "resources": [{"item": "Make-up ground crew", "qty": 12, "type": "people"},
                      {"item": "Dispatch coordinator", "qty": 2, "type": "people"},
                      {"item": "Maintenance engineer", "qty": 3, "type": "engineer"},
                      {"item": "Tugs + dollies", "qty": 10, "type": "equipment"}]},
    "reclaim": {"recovery_min": 60, "mitigation": [
        "Open alternate reclaim belts and re-assign arriving flights",
        "Manual offload to belt heads for affected carousels",
        "Passenger comms / FIDS update on reclaim belt changes"],
        "resources": [{"item": "Arrivals baggage crew", "qty": 8, "type": "people"},
                      {"item": "Customer service / comms agent", "qty": 2, "type": "people"},
                      {"item": "Maintenance engineer", "qty": 2, "type": "engineer"},
                      {"item": "Tugs + dollies", "qty": 4, "type": "equipment"}]},
    "oog": {"recovery_min": 45, "mitigation": [
        "Switch to full manual out-of-gauge handling at the OOG dock",
        "Porter oversize bags directly to make-up / aircraft stands",
        "Brief load control on OOG bags travelling late"],
        "resources": [{"item": "Baggage operatives (porters)", "qty": 4, "type": "people"},
                      {"item": "Flatbed trolleys", "qty": 4, "type": "equipment"},
                      {"item": "Maintenance engineer", "qty": 1, "type": "engineer"}]},
}

STAGE_LABELS = ["Check-in / Feed", "Screening", "Store / Transport", "Make-up", "Reclaim / Out"]

# ---------- systems ----------
# n(): node helper — id, name, capacity, stage, kind, parallel ids, status, downstream
def n(id, name, cap, stage, kind, parallel=None, status="in-service", to=None):
    return {"id": id, "name": name, "capacity": cap, "stage": stage, "kind": kind,
            "parallel": parallel or [], "status": status, "to": to or []}

SYSTEMS = {
    "t5": {
        "id": "t5", "name": "T5 Main Baggage", "terminal": "T5", "baseline_bags": 44100,
        "nodes": [
            n("CHECKIN", "Check-in & Sortation", 2600, 0, "feed", to=["HBS12", "HBS3", "VSO", "OOG"]),
            n("HBS12", "HBS 1/2 Screening", 1800, 1, "screening", ["HBS3", "VSO"], to=["EBS", "RECLAIM"]),
            n("HBS3", "HBS 3 Screening", 1200, 1, "screening", ["HBS12", "VSO"], "commissioning", to=["EBS"]),
            n("VSO", "Vertical Sortation (T5B)", 900, 1, "screening", ["HBS12", "HBS3"], "commissioning", to=["EBS"]),
            n("OOG", "Out-of-gauge", 300, 1, "oog", to=["OOGOUT"]),
            n("EBS", "Early Bag Store", 1500, 2, "store", to=["MAKEUP"]),
            n("ECB", "Empty Cart Buffers", 800, 2, "buffer", to=["MAKEUP"]),
            n("MAKEUP", "Make-up Laterals", 1600, 3, "makeup", to=["RECLAIM"]),
            n("OOGOUT", "OOG Make-up (oversize)", 300, 3, "makeup"),
            n("RECLAIM", "Reclaim", 2000, 4, "reclaim"),
        ],
    },
    "t3ib": {
        "id": "t3ib", "name": "T3 InterBag System", "terminal": "T3", "baseline_bags": 26000,
        "nodes": [
            n("T3IN", "T3 Check-in & Acceptance", 1600, 0, "feed", to=["T3HBS", "T3HBS2"]),
            n("T3HBS", "HBS Screening A", 1400, 1, "screening", ["T3HBS2"], to=["T3SORT"]),
            n("T3HBS2", "HBS Screening B", 1000, 1, "screening", ["T3HBS"], to=["T3SORT"]),
            n("T3SORT", "Sortation / EBS", 1500, 2, "store", to=["T3MU", "IB"]),
            n("IB", "InterBag Tunnel (T3↔T5)", 900, 2, "transport"),
            n("T3MU", "Make-up", 1300, 3, "makeup", to=["T3RCL"]),
            n("T3RCL", "Reclaim", 1500, 4, "reclaim"),
        ],
    },
    "pt5tbs": {
        "id": "pt5tbs", "name": "PT5 Track Baggage System", "terminal": "PT5", "baseline_bags": 18000,
        "nodes": [
            n("PT5IN", "Pier Feed", 1200, 0, "feed", to=["PT5SCR", "PT5SCR2"]),
            n("PT5SCR", "Screening A", 1000, 1, "screening", ["PT5SCR2"], to=["PT5TBS"]),
            n("PT5SCR2", "Screening B", 800, 1, "screening", ["PT5SCR"], to=["PT5TBS"]),
            n("PT5TBS", "Track Baggage Store (TBS)", 1400, 2, "store", to=["PT5MU"]),
            n("PT5MU", "Make-up", 1100, 3, "makeup", to=["PT5RCL"]),
            n("PT5RCL", "Reclaim", 1200, 4, "reclaim"),
        ],
    },
}


def _node(sys, nid):
    return next((x for x in sys["nodes"] if x["id"] == nid), None)


def _defaults(node):
    d = KIND_DEFAULTS.get(node["kind"], KIND_DEFAULTS["screening"])
    return {
        "recovery_min": node.get("recovery_min", d["recovery_min"]),
        "mitigation": node.get("mitigation", d["mitigation"]),
        "resources": node.get("resources", d["resources"]),
    }


def list_systems():
    return [{"id": s["id"], "name": s["name"], "terminal": s["terminal"],
             "lines": len(s["nodes"])} for s in SYSTEMS.values()]


def build_map(system_id):
    sys = SYSTEMS.get(system_id)
    if not sys:
        return None
    nodes_in = sys["nodes"]
    total = sum(x["capacity"] for x in nodes_in) or 1
    base = sys["baseline_bags"]
    nodes = [{
        "id": x["id"], "name": x["name"], "capacity": x["capacity"], "status": x["status"],
        "stage": x["stage"], "kind": x["kind"],
        "share_pct": round(x["capacity"] / total * 100),
        "bags": round(base * x["capacity"] / total),
    } for x in nodes_in]
    edges = [{"from": x["id"], "to": t} for x in nodes_in for t in x["to"]]
    stages = sorted({x["stage"] for x in nodes_in})
    return {"id": sys["id"], "name": sys["name"], "terminal": sys["terminal"],
            "baseline_bags": base, "nodes": nodes, "edges": edges,
            "stages": [{"stage": s, "label": STAGE_LABELS[s] if s < len(STAGE_LABELS) else f"Stage {s}"} for s in stages]}


def _downstream_set(sys, start_ids, lost):
    """All nodes reachable downstream from any lost node (excluding lost nodes)."""
    seen, stack = set(), list(start_ids)
    while stack:
        cur = stack.pop()
        node = _node(sys, cur)
        for t in (node["to"] if node else []):
            if t not in seen:
                seen.add(t)
                stack.append(t)
    return [t for t in seen if t not in lost]


def simulate(system_id, area_ids):
    """Simulate the loss of one or more lines. Parallel lines absorb diverted
    flow up to their spare capacity (a lost line cannot absorb; shared spare is
    allocated once across competing demands)."""
    sys = SYSTEMS.get(system_id)
    if not sys:
        return None
    lost_ids = [a for a in area_ids if _node(sys, a)]
    if not lost_ids:
        return None
    total = sum(x["capacity"] for x in sys["nodes"]) or 1
    base = sys["baseline_bags"]
    # design capacity per line scales with capacity share against a system design ~ base/0.85
    design = round(base / 0.85)
    capd = lambda x: x["capacity"] / total * design
    load = lambda x: base * x["capacity"] / total
    lost_set = set(lost_ids)

    # available spare on non-lost lines
    remaining = {x["id"]: max(0, round(capd(x) - load(x))) for x in sys["nodes"] if x["id"] not in lost_set}
    take = {k: 0 for k in remaining}

    per_line = []
    # allocate largest losses first so shared spare goes where it matters
    for lid in sorted(lost_ids, key=lambda i: -load(_node(sys, i))):
        node = _node(sys, lid)
        lost_bags = round(load(node))
        absorbers = [p for p in node["parallel"] if p not in lost_set]
        avail = sum(remaining.get(p, 0) for p in absorbers)
        to_absorb = min(lost_bags, avail)
        for p in absorbers:
            if avail <= 0:
                break
            alloc = round(to_absorb * remaining[p] / avail) if avail else 0
            alloc = min(alloc, remaining[p])
            remaining[p] -= alloc
            take[p] += alloc
        per_line.append({"id": lid, "name": node["name"], "kind": node["kind"],
                         "lost_bags": lost_bags, "absorbed": to_absorb,
                         "residual": lost_bags - to_absorb,
                         **_defaults(node)})

    total_lost = sum(p["lost_bags"] for p in per_line)
    total_absorbed = sum(p["absorbed"] for p in per_line)
    total_residual = total_lost - total_absorbed
    residual_pct = round(total_residual / (base or 1) * 100)
    lost_pct = round(total_lost / (base or 1) * 100)

    reroute = []
    for nid, t in take.items():
        if t <= 0:
            continue
        node = _node(sys, nid)
        reroute.append({"id": nid, "name": node["name"], "take": t,
                        "was_util": round(load(node) / (capd(node) or 1) * 100),
                        "new_util": round((load(node) + t) / (capd(node) or 1) * 100)})
    reroute.sort(key=lambda r: -r["take"])

    downstream_ids = _downstream_set(sys, lost_ids, lost_set)
    downstream = [{"id": d, "name": _node(sys, d)["name"]} for d in downstream_ids if _node(sys, d)]

    sev = "critical" if residual_pct >= 15 else "high" if residual_pct >= 8 else "medium" if total_residual > 0 else "low"

    # aggregate resources across all lost lines (sum by item)
    agg = {}
    for p in per_line:
        for r in p["resources"]:
            key = (r["item"], r["type"])
            agg[key] = agg.get(key, 0) + r["qty"]
    resources = [{"item": k[0], "type": k[1], "qty": v} for k, v in
                 sorted(agg.items(), key=lambda kv: (-kv[1], kv[0][0]))]

    return {
        "system": {"id": sys["id"], "name": sys["name"], "terminal": sys["terminal"]},
        "areas": [{"id": p["id"], "name": p["name"]} for p in per_line],
        "lost_bags": total_lost, "lost_pct": lost_pct,
        "absorbed": total_absorbed, "residual": total_residual, "residual_pct": residual_pct,
        "reroute": reroute, "downstream": downstream, "severity": sev,
        "recovery_min": max(p["recovery_min"] for p in per_line),
        "per_line": [{"id": p["id"], "name": p["name"], "lost_bags": p["lost_bags"],
                      "absorbed": p["absorbed"], "residual": p["residual"],
                      "mitigation": p["mitigation"]} for p in per_line],
        "resources": resources,
    }
