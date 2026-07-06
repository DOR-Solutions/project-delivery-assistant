import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT.parent) not in sys.path:
    sys.path.insert(0, str(ROOT.parent))

from backend.app.mfd_routing import assess_outage


def test_hbs_outage_is_critical_with_large_residual():
    result = assess_outage("HBS_1_2", day_type="A", availability=0.0)
    assert result["band"] == "critical"
    assert result["residual_unhandled"] > 9000
