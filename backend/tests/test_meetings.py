from app import ai, actions
from app.parsing import parse_vtt, parse_file


def test_action_classification():
    assert actions.classify_owner("Pratik Darjee (ICTS)") == "supplier"
    assert actions.classify_owner("Dalkia") == "supplier"
    assert actions.classify_owner("Andrew Groom") == "pm"
    assert actions.classify_owner("") == "unassigned"
    assert actions.classify_workstream("Align comms language with BA Ops") == "Comms & Stakeholders"
    assert actions.classify_workstream("Progress RTG and SAT sign-off") == "Commissioning & Safety"
    assert actions.norm_status("CLOSED") == "closed"
    assert actions.norm_status("") == "open"


def test_teams_vtt_parsing():
    vtt = (
        b"WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.500\n"
        b"<v Andy Groom>Good morning everyone.</v>\n\n"
        b"2\n00:00:03.500 --> 00:00:07.000\n"
        b"<v Andy Groom>Area 25 go-live is confirmed.</v>\n\n"
        b"3\n00:00:07.200 --> 00:00:10.000\n"
        b"<v Ali Zakaria>Thanks Andy.</v>\n"
    )
    txt = parse_vtt(vtt)
    assert "WEBVTT" not in txt and "-->" not in txt
    # consecutive same-speaker cues merge into one turn
    assert "Andy Groom: Good morning everyone. Area 25 go-live is confirmed." in txt
    assert "Ali Zakaria: Thanks Andy." in txt
    assert parse_file("Meeting.vtt", vtt)[1] == "transcript"


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
