from app import roster


def test_summary_totals():
    s = roster.summary()
    assert s["shifts"] == 745
    assert s["headcount"] == 103
    assert s["total_cost"] > 90000
    # ABC charge rates uplift the internal pay cost
    assert s["total_charge"] > s["total_cost"]
    assert s["uplift_pct"] > 0
    # projection extends the committed charge to a full calendar month
    assert s["projected_month_charge"] >= s["total_charge"]
    assert s["days_in_month"] == 30


def test_breakdowns_reconcile():
    rep = roster.report()
    total = rep["summary"]["total_charge"]
    # zone and role splits should each sum (close) to the total charge cost
    assert abs(sum(z["charge"] for z in rep["by_zone"]) - total) < 1.0
    assert abs(sum(r["charge"] for r in rep["by_role"]) - total) < 1.0
    assert sum(d["cost"] for d in rep["daily"]) > 0
    assert len(rep["top_staff"]) <= 15
    assert rep["rate_card"]["supplier"] == "ABC"


def test_day_night_split():
    # 14:00–23:00 = 6h day (to 20:00) + 3h night
    day, night = roster._day_night_split("02:00 PM", "11:00 PM")
    assert round(day, 2) == 6.0 and round(night, 2) == 3.0


def test_mitigation_supplier_line():
    sup = roster.mitigation_supplier()
    assert sup["source"] == "roster"
    assert sup["spent"] > 0 and sup["budget"] >= sup["spent"]
    assert "ABC" in sup["name"]
