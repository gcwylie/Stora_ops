from __future__ import annotations

from datetime import date

from stora_schema.models import History, Shift, Staff
from stora_schema.safety import SafetyError, write_drafts
from stora_schema.solver import build_plan


def _history() -> History:
    baker_a = Staff("1", "Ada Baker", ("Bageri",))
    baker_b = Staff("2", "Bo Baker", ("Bageri",))
    foh_a = Staff("3", "Cara FOH", ("FOH Full Time",))
    foh_b = Staff("4", "Dan FOH", ("FOH Full Time",))
    week_35 = [
        Shift("1", date(2026, 8, 24), "Avbak", "03:00", "11:30"),
        Shift("2", date(2026, 8, 24), "Bakers", "05:20", "13:50"),
        Shift("3", date(2026, 8, 24), "FOH AM", "06:30", "14:30"),
        Shift("1", date(2026, 8, 29), "Avbak (Helg)", "05:00", "14:00"),
        Shift("3", date(2026, 8, 29), "FOH PM", "09:00", "18:30"),
        Shift("2", date(2026, 8, 30), "Helg", "06:00", "14:30"),
        Shift("4", date(2026, 8, 30), "FOH PM", "09:00", "18:30"),
    ]
    week_34_weekends = [
        Shift("1", date(2026, 8, 22), "Avbak (Helg)", "05:00", "14:00"),
        Shift("1", date(2026, 8, 23), "Avbak (Helg)", "05:00", "14:00"),
        Shift("3", date(2026, 8, 22), "FOH PM", "09:00", "18:30"),
    ]
    return History(
        staff=[baker_a, baker_b, foh_a, foh_b],
        shifts=week_34_weekends + week_35,
    )


def test_keeps_existing_shifts_locked():
    history = _history()
    plan = build_plan(history, "2026-08-24")
    monday_avbak = [
        item
        for item in plan.assignments
        if item.day == date(2026, 8, 24) and item.role == "Avbak"
    ]
    assert len(monday_avbak) == 1
    assert monday_avbak[0].staff_name == "Ada Baker"
    assert monday_avbak[0].locked


def test_weekend_fairness_prefers_person_with_fewer_weekends():
    history = _history()
    plan = build_plan(history, "2026-08-31")
    saturday = [item for item in plan.assignments if item.day == date(2026, 9, 5) and not item.locked]
    sunday = [item for item in plan.assignments if item.day == date(2026, 9, 6) and not item.locked]
    weekend_names = {item.staff_name for item in saturday + sunday}
    assert "Bo Baker" in weekend_names
    assert "Ada Baker" not in {item.staff_name for item in saturday}


def test_write_drafts_never_publishes_and_refuses_without_uploader():
    history = _history()
    plan = build_plan(history, "2026-08-31")
    new_items = [item for item in plan.assignments if not item.locked]
    assert new_items
    assert all(not item.published for item in new_items)
    try:
        write_drafts(history, plan)
        raise AssertionError("expected SafetyError")
    except SafetyError as exc:
        assert "not enabled" in str(exc)
        assert "nothing was written" in str(exc)
