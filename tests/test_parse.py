from stora_schema.models import parse_role_text


def test_parse_role_text():
    assert parse_role_text("05:20 – 13:50 Bakers") == ("05:20", "13:50", "Bakers")
    assert parse_role_text("11:00 – 18:30 PM Runner Close") == ("11:00", "18:30", "PM Runner Close")
