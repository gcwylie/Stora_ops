from __future__ import annotations

from collections import Counter
from datetime import timedelta

from stora_schema.models import History, Shift, Slot, Staff, monday_of, week_dates


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

# Stora FOH is a fixed daily pattern, not copied from last week's messy mix.
FOH_STORA_ROLES = {
    "FOH AM",
    "FOH PM",
    "FOH WEEKEND PM",
    "PM Runner",
    "PM Runner Close",
    "Runner AM",
}
SANKT_ERIKSGATAN_ROLES = {
    "FOH CLOSE",
    "FOH Open",
    "FOH OPEN WEEKEND",
    "FOH MID WEEKEND",
    "FOH MID",
    "Close Short",
    "Open short",
}
SKIP_TEMPLATE_ROLES = SANKT_ERIKSGATAN_ROLES | FOH_STORA_ROLES | {"GAST COVER"}

# role, start, end, people per day
FOH_STORA_PATTERN: tuple[tuple[str, str, str, int], ...] = (
    ("FOH AM", "06:30", "14:30", 1),
    ("FOH PM", "09:00", "18:30", 1),
    ("Runner AM", "07:30", "15:00", 1),
    ("PM Runner", "08:00", "17:30", 2),
    ("PM Runner Close", "11:00", "18:30", 2),
)


def template_week(history: History, before=None) -> list[Shift]:
    monday = history.latest_week_monday(before=before)
    if monday is None:
        return []
    return history.shifts_in_week(monday)


def infer_slots(history: History, target_monday) -> list[Slot]:
    """Bakery/kitchen/admin from last week; Stora FOH is a fixed daily pattern."""
    template = template_week(history, before=target_monday)
    slots: list[Slot] = []
    if template:
        template_monday = monday_of(min(shift.day for shift in template))
        for shift in template:
            if shift.role in SKIP_TEMPLATE_ROLES:
                continue
            offset = (shift.day - template_monday).days
            slots.append(
                Slot(
                    day=target_monday + timedelta(days=offset),
                    role=shift.role,
                    start=shift.start,
                    end=shift.end,
                )
            )
    for day in week_dates(target_monday):
        for role, start, end, count in FOH_STORA_PATTERN:
            for _ in range(count):
                slots.append(Slot(day=day, role=role, start=start, end=end))
    admin_days = {slot.day for slot in slots if slot.role == "ADMIN"}
    for day in week_dates(target_monday):
        if day.weekday() < 5 and day not in admin_days:
            slots.append(Slot(day=day, role="ADMIN", start="09:00", end="17:00"))
    return sorted(slots, key=lambda slot: (slot.day, slot.start, slot.role))


def eligible_staff(history: History, slot: Slot) -> list[Staff]:
    role = slot.role
    allowed_groups = ROLE_GROUPS.get(role)
    by_id = history.staff_by_id()
    if allowed_groups:
        people = [
            person
            for person in history.staff
            if any(group in person.groups for group in allowed_groups)
            and person.id not in history.inactive_ids
        ]
    else:
        from_history = {shift.staff_id for shift in history.shifts if shift.role == role}
        people = [by_id[staff_id] for staff_id in from_history if staff_id in by_id and staff_id not in history.inactive_ids]
    extra_ids = {
        staff_id
        for staff_id, extra_role, start, end in history.extra_roles
        if extra_role == role and start == slot.start and end == slot.end
    }
    for staff_id in extra_ids:
        person = by_id.get(staff_id)
        if person and person not in people and person.id not in history.inactive_ids:
            people.append(person)
    if role in FOH_STORA_ROLES or role == "ADMIN":
        people = [
            person
            for person in people
            if person.id not in history.exclude_foh_ids
        ]
    if role in FOH_STORA_ROLES:
        people = [person for person in people if person.id not in history.admin_primary_ids]
        for staff_id in history.extra_foh_ids:
            person = by_id.get(staff_id)
            if person and person not in people and person.id not in history.inactive_ids:
                people.append(person)
    return people


def coverage_summary(history: History) -> dict[str, Counter]:
    """Weekday name -> role counts from the latest scheduled week."""
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    summary: dict[str, Counter] = {name: Counter() for name in names}
    for shift in template_week(history):
        summary[names[shift.day.weekday()]][shift.role] += 1
    return summary
