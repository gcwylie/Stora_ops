from __future__ import annotations

from collections import defaultdict

from stora_schema.infer import FOH_STORA_ROLES, eligible_staff, infer_slots
from stora_schema.models import History, Plan, ProposedShift, Shift, Slot, iter_weekends, monday_of, week_dates


def build_plan(history: History, week: str, existing_target_shifts: list | None = None) -> Plan:
    monday = monday_of(week)
    existing = existing_target_shifts if existing_target_shifts is not None else history.shifts_in_week(monday)
    slots = infer_slots(history, monday)
    weekend_history = iter_weekends(shift for shift in history.shifts if shift.day < monday)
    assigned_days: dict[str, set] = defaultdict(set)
    weekend_this_week: dict[str, int] = defaultdict(int)
    assignments: list[ProposedShift] = []
    by_id = history.staff_by_id()
    remaining = list(slots)

    for shift in existing:
        assigned_days[shift.staff_id].add(shift.day)
        if shift.weekend:
            weekend_this_week[shift.staff_id] += 1
        match = _find_slot(remaining, shift)
        if match is not None:
            remaining.pop(match)
        person = by_id.get(shift.staff_id)
        assignments.append(
            ProposedShift(
                staff_id=shift.staff_id,
                staff_name=person.name if person else shift.staff_id,
                day=shift.day,
                role=shift.role,
                start=shift.start,
                end=shift.end,
                published=False,
                locked=True,
            )
        )

    ordered = sorted(remaining, key=_slot_order)
    unfilled: list[Slot] = []
    for slot in ordered:
        chosen = _pick(history, slot, assigned_days, weekend_history, weekend_this_week, monday)
        if chosen is None:
            unfilled.append(slot)
            continue
        assigned_days[chosen.id].add(slot.day)
        if slot.weekend:
            weekend_this_week[chosen.id] += 1
        assignments.append(
            ProposedShift(
                staff_id=chosen.id,
                staff_name=chosen.name,
                day=slot.day,
                role=slot.role,
                start=slot.start,
                end=slot.end,
                published=False,
                locked=False,
            )
        )

    counts = {
        by_id[staff_id].name: weekend_history.get(staff_id, 0) + weekend_this_week.get(staff_id, 0)
        for staff_id in {item.staff_id for item in assignments}
        if staff_id in by_id
    }
    assignments.sort(key=lambda item: (item.day, item.start, item.staff_name, item.locked))
    return Plan(monday=monday, assignments=assignments, unfilled=unfilled, weekend_counts=counts)


def _find_slot(slots: list[Slot], shift: Shift) -> int | None:
    for index, slot in enumerate(slots):
        if slot.day == shift.day and slot.role == shift.role and slot.start == shift.start and slot.end == shift.end:
            return index
    return None


def _slot_order(slot: Slot) -> tuple:
    if slot.role == "Bordspasset" and slot.start == "08:00":
        return (0, slot.day, slot.start, slot.role)
    if slot.role == "ADMIN":
        return (1, slot.day, slot.start, slot.role)
    if slot.weekend:
        return (2, slot.day, slot.start, slot.role)
    return (3, slot.day, slot.start, slot.role)


def _pick(history, slot: Slot, assigned_days, weekend_history, weekend_this_week, monday):
    candidates = []
    for person in eligible_staff(history, slot):
        if slot.day in assigned_days[person.id]:
            continue
        if (person.id, slot.day) in history.absences:
            continue
        allowed = history.available_only.get(person.id)
        if allowed is not None and slot.day not in allowed:
            continue
        if slot.role == "ADMIN" and person.id in history.prefer_five_day_ids and person.id not in history.admin_primary_ids:
            continue
        worked = assigned_days[person.id]
        limit = _day_limit(history, person)
        if limit is not None and len(worked) >= limit:
            continue
        if _needs_consecutive_offs(history, person) and not _has_consecutive_offs(
            monday, worked, slot.day, _forced_offs(history, person, monday)
        ):
            continue
        prior_weekends = weekend_history.get(person.id, 0)
        extra_this_weekend = weekend_this_week.get(person.id, 0)
        weekend_score = prior_weekends + 2 * extra_this_weekend
        load = len(worked)
        prefer_admin = 0 if person.id in history.admin_primary_ids and slot.role in {"ADMIN", "Bordspasset"} else 1
        prefer_five = (
            0
            if person.id in history.prefer_five_day_ids and slot.role in FOH_STORA_ROLES and load < 5
            else 1
        )
        if slot.weekend:
            score = (prefer_admin, prefer_five, weekend_score, extra_this_weekend, load, person.name)
        else:
            score = (prefer_admin, prefer_five, load, weekend_score, person.name)
        candidates.append((score, person))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


def _is_casual_foh(history: History, person) -> bool:
    if person.id in history.prefer_five_day_ids or person.id in history.admin_primary_ids:
        return False
    if person.id in history.exclude_foh_ids:
        return False
    if person.id in history.extra_foh_ids:
        return True
    return "FOH Full Time" in person.groups


def _day_limit(history: History, person) -> int | None:
    if person.id in history.max_shifts:
        return history.max_shifts[person.id]
    if person.id in history.prefer_five_day_ids or person.id in history.admin_primary_ids:
        return 5
    if _is_casual_foh(history, person):
        return 3
    return None


def _needs_consecutive_offs(history: History, person) -> bool:
    return person.id in history.prefer_five_day_ids or person.id in history.admin_primary_ids


def _forced_offs(history: History, person, monday) -> set:
    return {day for day in week_dates(monday) if (person.id, day) in history.absences}


def _consecutive_pair(days, offs) -> bool:
    off_set = set(offs)
    for index, day in enumerate(days):
        nxt = days[(index + 1) % 7]
        if day in off_set and nxt in off_set:
            return True
    return False


def _has_consecutive_offs(monday, worked, extra_day, forced_offs=None) -> bool:
    after = set(worked) | {extra_day}
    days = week_dates(monday)
    offs = [day for day in days if day not in after]
    if len(offs) < 2 or _consecutive_pair(days, offs):
        return True
    forced = set(forced_offs or ())
    if forced and not _consecutive_pair(days, forced):
        return True
    return False
