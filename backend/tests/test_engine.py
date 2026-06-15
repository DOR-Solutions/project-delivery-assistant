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
