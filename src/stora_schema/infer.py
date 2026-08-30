from __future__ import annotations

from collections import Counter
from datetime import timedelta

from stora_schema.models import History, Shift, Slot, Staff, monday_of


ROLE_GROUPS: dict[str, tuple[str, ...]] = {
    "Bakers": ("Bageri",),
    "Helg": ("Bageri",),
    "Avbak": ("Bageri",),
    "Avbak (Helg)": ("Bageri",),
    "Avbak (Natt)": ("Bageri",),
    "Bordspasset": ("Bageri",),
    "Tråg": ("Bageri",),
    "FOH AM": ("FOH Full Time",),
    "FOH PM": ("FOH Full Time",),
    "FOH WEEKEND PM": ("FOH Full Time",),
    "PM Runner": ("FOH Full Time",),
    "PM Runner Close": ("FOH Full Time",),
    "Runner AM": ("FOH Full Time",),
    "FOH MID": ("FOH Full Time", "FOH Sankt Eriksgatan"),
    "ADMIN": ("FOH Full Time", "Management"),
    "Kitchen AM": ("Kitchen",),
    "Kitchen PM": ("Kitchen",),
    "Kitchen Prep": ("Kitchen Prep",),
    "GAST COVER": ("GAST Cover", "FOH Full Time"),
    "FOH CLOSE": ("FOH Sankt Eriksgatan",),
    "FOH Open": ("FOH Sankt Eriksgatan",),
    "FOH OPEN WEEKEND": ("FOH Sankt Eriksgatan",),
    "FOH MID WEEKEND": ("FOH Sankt Eriksgatan",),
    "Close Short": ("FOH Sankt Eriksgatan",),
    "Open short": ("FOH Sankt Eriksgatan",),
    "Bagare 2": ("Bageri",),
}


def template_week(history: History, before=None) -> list[Shift]:
    monday = history.latest_week_monday(before=before)
    if monday is None:
        return []
    return history.shifts_in_week(monday)


def infer_slots(history: History, target_monday) -> list[Slot]:
    """Copy last scheduled week's coverage shape onto the target week, not the people."""
    template = template_week(history, before=target_monday)
    if not template:
        return []
    template_monday = monday_of(min(shift.day for shift in template))
    slots: list[Slot] = []
    for shift in template:
        offset = (shift.day - template_monday).days
        slots.append(
            Slot(
                day=target_monday + timedelta(days=offset),
                role=shift.role,
                start=shift.start,
                end=shift.end,
            )
        )
    return sorted(slots, key=lambda slot: (slot.day, slot.start, slot.role))


def eligible_staff(history: History, role: str) -> list[Staff]:
    allowed_groups = ROLE_GROUPS.get(role)
    if allowed_groups:
        return [
            person
            for person in history.staff
            if any(group in person.groups for group in allowed_groups)
        ]
    by_id = history.staff_by_id()
    from_history = {shift.staff_id for shift in history.shifts if shift.role == role}
    return [by_id[staff_id] for staff_id in from_history if staff_id in by_id]


def coverage_summary(history: History) -> dict[str, Counter]:
    """Weekday name -> role counts from the latest scheduled week."""
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    summary: dict[str, Counter] = {name: Counter() for name in names}
    for shift in template_week(history):
        summary[names[shift.day.weekday()]][shift.role] += 1
    return summary
