from app import engine

def test_risk_band():
    assert engine.risk_band(20) == "critical"
    assert engine.risk_band(12) == "high"
    assert engine.risk_band(6) == "medium"
    assert engine.risk_band(2) == "low"

def test_score_risks_sorted():
    rs = engine.score_risks([{"likelihood":3,"impact":2},{"likelihood":5,"impact":4}])
    assert rs[0]["score"] == 20 and rs[0]["band"] == "critical"
    assert rs[1]["score"] == 6

def test_compute_ops():
    ops = {"bag_daily":[{"planned":45000,"actual":44100,"capacity":52000,"mishandled":198,"oog":900}],
           "risks":[{"likelihood":5,"impact":4},{"likelihood":3,"impact":3}]}
    c = engine.compute_ops(ops)
    assert c["util_pct"] == 85
    assert c["adhere_pct"] == 98
    assert c["critical"] == 1 and c["open_high"] == 2

def test_impact():
    ops = {"areas":[{"id":"HBS12","name":"HBS 1/2","capacity":1800},{"id":"MAKEUP","name":"Make-up","capacity":1600},{"id":"RECLAIM","name":"Reclaim","capacity":2000}]}
    comp = {"last":{"actual":44000}}
    res = engine.impact_of(ops, comp, "HBS12")
    assert res["share_pct"] > 0 and "Make-up" in res["downstream"]

def test_forecast_directs():
    directs = {"actual":[{"date":"2026-06-02","day":"Tue","bags":21000},{"date":"2026-06-03","day":"Wed","bags":21500}],
               "plan":[{"date":"2026-06-09","day":"Tue","type":"B","bags":21448}]}
    fc = engine.forecast_directs(directs)
    assert fc[0]["plan"] == 21448 and fc[0]["max"] == 21000

def test_forecast_mitigation():
    mit = [{"date":"2026-06-03","day":"Wed","foh":1100,"cdf":400,"mip":1000,"total":2500}]
    out = engine.forecast_mitigation(mit, start="2026-06-09", horizon=3)
    assert out["avg_total"] == 2500 and len(out["fc"]) == 3

def test_health_rag():
    assert engine.health_for(20, 1, 2)["rag"] == "red"      # low completion
    assert engine.health_for(58, 1, 1)["rag"] == "amber"    # mid completion
    assert engine.health_for(72, 0, 2)["rag"] == "green"    # high, no critical
    assert engine.health_for(80, 3, 5)["rag"] == "amber"    # high but critical caps to amber

def test_gate_progress():
    g = engine.gate_progress("G6", 80)
    assert g["next"] == "G7" and g["next_label"] == "Handover / SAT"
    stages = {s["gate"]: s["status"] for s in g["stages"]}
    assert stages["G5"] == "done" and stages["G6"] == "active" and stages["G7"] == "todo"
    assert len(g["stages"]) == 9

def test_whatif():
    comp = {"util_pct": 85, "critical": 1, "last": {"actual": 24000}}
    meta = {"completion": 80, "crew_baseline": 38}
    base = engine.whatif(comp, meta, 100, 38, 0)
    assert base["utilisation"] == 85 and base["projected_completion"] == 80
    # more volume, fewer crew -> higher utilisation and a later SAT
    stressed = engine.whatif(comp, meta, 130, 25, 0)
    assert stressed["utilisation"] > base["utilisation"]
    assert stressed["risk_index"] == "High"
    assert stressed["sat_date_shift"] >= base["sat_date_shift"]

def test_lookahead():
    from datetime import date
    acts = [
        {"id": "A1", "name": "Critical job", "wbs": "W", "discipline": "COM", "pct": 20,
         "start": "2026-06-16", "finish": "2026-07-10", "bl_finish": "2026-06-30", "total_float": -5},
        {"id": "A2", "name": "On track", "wbs": "W", "discipline": "DOC", "pct": 0,
         "start": "2026-06-20", "finish": "2026-06-25", "bl_finish": "2026-06-27", "total_float": 30},
        {"id": "A3", "name": "Done", "wbs": "W", "discipline": "DOC", "pct": 100,
         "start": "2026-06-18", "finish": "2026-06-19", "bl_finish": "2026-06-19", "total_float": 5},
        {"id": "A4", "name": "Beyond window", "wbs": "W", "discipline": "DOC", "pct": 0,
         "start": "2026-12-01", "finish": "2026-12-10", "bl_finish": "2026-12-10", "total_float": 5},
    ]
    res = engine.compute_lookahead(acts, weeks=6, as_of=date(2026, 6, 16))
    ids = [a["id"] for a in res["activities"]]
    assert "A3" not in ids and "A4" not in ids       # 100% and out-of-window excluded
    assert res["summary"]["critical"] == 1            # A1 negative float
    assert res["activities"][0]["id"] == "A1"         # critical sorted first
    risks = engine.lookahead_risks(res["activities"])
    assert any("Critical job" in r["title"] for r in risks)
