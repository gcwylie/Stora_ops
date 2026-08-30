from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Iterable


@dataclass(frozen=True)
class Staff:
    id: str
    name: str
    groups: tuple[str, ...] = ()


@dataclass(frozen=True)
class Shift:
    staff_id: str
    day: date
    role: str
    start: str
    end: str

    @property
    def weekend(self) -> bool:
        return self.day.weekday() >= 5

    @property
    def slot_key(self) -> tuple[int, str, str, str]:
        return (self.day.weekday(), self.role, self.start, self.end)


@dataclass(frozen=True)
class Slot:
    day: date
    role: str
    start: str
    end: str

    @property
    def weekend(self) -> bool:
        return self.day.weekday() >= 5


@dataclass
class ProposedShift:
    staff_id: str
    staff_name: str
    day: date
    role: str
    start: str
    end: str
    published: bool = False
    locked: bool = False


@dataclass
class History:
    staff: list[Staff]
    shifts: list[Shift]
    absences: set[tuple[str, date]] = field(default_factory=set)

    def staff_by_id(self) -> dict[str, Staff]:
        return {person.id: person for person in self.staff}

    def latest_week_monday(self, before: date | None = None) -> date | None:
        shifts = self.shifts if before is None else [shift for shift in self.shifts if shift.day < before]
        if not shifts:
            return None
        last = max(shift.day for shift in shifts)
        return last - timedelta(days=last.weekday())

    def shifts_in_week(self, monday: date) -> list[Shift]:
        end = monday + timedelta(days=6)
        return [shift for shift in self.shifts if monday <= shift.day <= end]


@dataclass
class Plan:
    monday: date
    assignments: list[ProposedShift]
    unfilled: list[Slot]
    weekend_counts: dict[str, int]

    @property
    def sunday(self) -> date:
        return self.monday + timedelta(days=6)


class SafetyError(RuntimeError):
    """Raised when a write would change an existing schedule or publish."""


def parse_role_text(text: str) -> tuple[str, str, str]:
    """Parse '05:20 – 13:50 Bakers' into (start, end, role)."""
    cleaned = " ".join(text.replace("–", "-").split())
    parts = cleaned.split(" ", 3)
    if len(parts) < 4 or parts[1] != "-":
        raise ValueError(f"Cannot parse shift text: {text!r}")
    return parts[0], parts[2], parts[3]


def week_dates(monday: date) -> list[date]:
    return [monday + timedelta(days=offset) for offset in range(7)]


def parse_iso_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def monday_of(value: date | str) -> date:
    day = parse_iso_date(value) if isinstance(value, str) else value
    return day - timedelta(days=day.weekday())


def iter_weekends(shifts: Iterable[Shift]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for shift in shifts:
        if shift.weekend:
            counts[shift.staff_id] = counts.get(shift.staff_id, 0) + 1
    return counts
