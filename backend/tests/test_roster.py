from app import roster


def test_summary_totals():
    s = roster.summary()
    assert s["shifts"] == 745
    assert s["headcount"] == 103
    assert s["total_cost"] > 90000
    # projection extends the committed spend to a full calendar month
    assert s["projected_month_cost"] >= s["total_cost"]
    assert s["days_in_month"] == 30


def test_breakdowns_reconcile():
    rep = roster.report()
    total = rep["summary"]["total_cost"]
    # zone and role splits should each sum (close) to the total committed cost
    assert abs(sum(z["cost"] for z in rep["by_zone"]) - total) < 1.0
    assert abs(sum(r["cost"] for r in rep["by_role"]) - total) < 1.0
    assert sum(d["cost"] for d in rep["daily"]) > 0
    assert len(rep["top_staff"]) <= 15
