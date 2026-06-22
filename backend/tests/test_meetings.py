from app import ai


def test_heuristic_meeting_extracts_actions_and_attendees():
    text = (
        "Chair: Andy Groom\n"
        "1. Attendees\n• Andy Groom (Chair)\n• Ali Zakaria\n• Matt Davies\n"
        "Apologies:\n• Duncan Byers\n"
        "Area 25 go-live confirmed for the night of 12 May.\n"
        "10. Actions\nA1 Issue stakeholder comms\nA2 Align comms language\n"
    )
    ex = ai.heuristic_meeting("PILZ Session", text)
    assert ex["chair"] == "Andy Groom"
    assert "Ali Zakaria" in ex["attendees"]
    assert "Duncan Byers" not in ex["attendees"]  # apologies excluded
    assert any(a["ref"] == "A1" for a in ex["actions"])
    assert any("go-live" in d.lower() for d in ex["decisions"])
