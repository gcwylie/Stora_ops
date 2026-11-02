from __future__ import annotations

from datetime import date, timedelta

from stora_schema.infer import SANKT_ERIKSGATAN_ROLES, infer_slots
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


def test_stora_foh_uses_fixed_daily_pattern_and_skips_sankt_eriksgatan():
    history = _history()
    history.shifts.append(Shift("3", date(2026, 8, 25), "FOH CLOSE", "09:00", "17:30"))
    slots = infer_slots(history, date(2026, 8, 31))
    monday = [slot for slot in slots if slot.day == date(2026, 8, 31)]
    roles = [slot.role for slot in monday]
    assert roles.count("FOH AM") == 1
    assert roles.count("FOH PM") == 1
    assert roles.count("Runner AM") == 1
    assert roles.count("PM Runner") == 2
    assert roles.count("PM Runner Close") == 2
    assert all(slot.role not in SANKT_ERIKSGATAN_ROLES for slot in slots)


def test_camila_left_bageri_is_not_eligible():
    history = _history()
    history.staff.append(Staff("9", "Camila", ()))
    plan = build_plan(history, "2026-08-31")
    assert all(item.staff_name != "Camila" for item in plan.assignments)


def test_part_time_only_on_green_tick_days():
    history = _history()
    part_timer = Staff("8", "Edwin PT", ("FOH Full Time",))
    history.staff.append(part_timer)
    history.available_only["8"] = {date(2026, 8, 31)}
    plan = build_plan(history, "2026-08-31")
    edwin_days = {item.day for item in plan.assignments if item.staff_id == "8"}
    assert edwin_days <= {date(2026, 8, 31)}


def test_skips_gast_cover():
    history = _history()
    history.shifts.append(Shift("3", date(2026, 8, 24), "GAST COVER", "08:00", "15:00"))
    slots = infer_slots(history, date(2026, 8, 31))
    assert all(slot.role != "GAST COVER" for slot in slots)


def test_graeme_admin_and_late_bordspasset_not_foh_floor():
    history = _history()
    graeme = Staff("103325", "Graeme Wylie", ("FOH Full Time",))
    baker = Staff("5", "Eve Baker", ("Bageri",))
    history.staff.extend([graeme, baker])
    history.admin_primary_ids.add("103325")
    history.extra_roles.append(("103325", "Bordspasset", "08:00", "16:30"))
    history.shifts.append(Shift("1", date(2026, 8, 25), "Bordspasset", "08:00", "16:30"))
    history.shifts.append(Shift("1", date(2026, 8, 26), "Bordspasset", "08:00", "16:30"))
    plan = build_plan(history, "2026-08-31")
    graeme_shifts = [item for item in plan.assignments if item.staff_id == "103325"]
    roles = {item.role for item in graeme_shifts}
    assert "ADMIN" in roles
    assert "FOH AM" not in roles
    assert all(item.start == "08:00" for item in graeme_shifts if item.role == "Bordspasset")


def test_maya_gets_five_foh_days_with_consecutive_offs():
    history = _history()
    maya = Staff("776220", "Maya Hedman", ("FOH Full Time",))
    extras = [Staff(str(index), f"FOH {index}", ("FOH Full Time",)) for index in range(10, 20)]
    history.staff.extend([maya, *extras])
    history.prefer_five_day_ids.add("776220")
    plan = build_plan(history, "2026-08-31")
    maya_days = sorted(item.day for item in plan.assignments if item.staff_id == "776220")
    assert len(maya_days) == 5
    week = [date(2026, 8, 31) + timedelta(days=offset) for offset in range(7)]
    offs = [day for day in week if day not in set(maya_days)]
    assert "ADMIN" not in {item.role for item in plan.assignments if item.staff_id == "776220"}
    consecutive = any(week[index] in offs and week[(index + 1) % 7] in offs for index in range(7))
    assert consecutive


def test_excluded_people_are_not_assigned_foh():
    history = _history()
    blocked = Staff("9", "Valentina", ("FOH Full Time",))
    history.staff.append(blocked)
    history.exclude_foh_ids.add("9")
    plan = build_plan(history, "2026-08-31")
    assert all(item.staff_id != "9" for item in plan.assignments)


def test_casual_foh_capped_at_three_days():
    history = _history()
    casual = Staff("9", "Casual FOH", ("FOH Full Time",))
    history.staff.append(casual)
    plan = build_plan(history, "2026-08-31")
    days = {item.day for item in plan.assignments if item.staff_id == "9"}
    assert len(days) <= 3


def test_viggo_only_one_tick_day():
    history = _history()
    viggo = Staff("767798", "Viggo Onyango", ("FOH Full Time",))
    history.staff.append(viggo)
    history.available_only["767798"] = {date(2026, 8, 31)}
    history.max_shifts["767798"] = 1
    plan = build_plan(history, "2026-08-31")
    viggo_days = {item.day for item in plan.assignments if item.staff_id == "767798"}
    assert viggo_days <= {date(2026, 8, 31)}
    assert len(viggo_days) <= 1


def test_ella_onyango_can_work_stora_foh():
    history = _history()
    ella = Staff("445904", "Ella Onyango", ("FOH Sankt Eriksgatan",))
    history.staff.append(ella)
    history.extra_foh_ids.add("445904")
    history.prefer_five_day_ids.add("445904")
    plan = build_plan(history, "2026-08-31")
    ella_shifts = [item for item in plan.assignments if item.staff_id == "445904"]
    assert ella_shifts
    assert all(item.role != "FOH CLOSE" for item in ella_shifts)
    assert len({item.day for item in ella_shifts}) == 5


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
