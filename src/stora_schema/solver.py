from __future__ import annotations

from collections import defaultdict

from stora_schema.infer import eligible_staff, infer_slots
from stora_schema.models import History, Plan, ProposedShift, Shift, Slot, iter_weekends, monday_of


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

    ordered = sorted(remaining, key=lambda slot: (not slot.weekend, slot.day, slot.start, slot.role))
    unfilled: list[Slot] = []
    for slot in ordered:
        chosen = _pick(history, slot, assigned_days, weekend_history, weekend_this_week)
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


def _pick(history, slot: Slot, assigned_days, weekend_history, weekend_this_week):
    candidates = []
    for person in eligible_staff(history, slot.role):
        if slot.day in assigned_days[person.id]:
            continue
        if (person.id, slot.day) in history.absences:
            continue
        prior_weekends = weekend_history.get(person.id, 0)
        extra_this_weekend = weekend_this_week.get(person.id, 0)
        weekend_score = prior_weekends + 2 * extra_this_weekend
        load = len(assigned_days[person.id])
        if slot.weekend:
            score = (weekend_score, extra_this_weekend, load, person.name)
        else:
            score = (load, weekend_score, person.name)
        candidates.append((score, person))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]
