from __future__ import annotations

import json
from pathlib import Path

from stora_schema.models import History, Shift, Staff, parse_iso_date, parse_role_text


def load_history(path: str | Path) -> History:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    staff = [
        Staff(
            id=str(item["id"]),
            name=item["name"],
            groups=tuple(item.get("groups") or ()),
        )
        for item in payload["staff"]
    ]
    shifts: list[Shift] = []
    for item in payload["shifts"]:
        start, end, role = _role_fields(item)
        shifts.append(
            Shift(
                staff_id=str(item["staff_id"]),
                day=parse_iso_date(item["date"]),
                role=role,
                start=start,
                end=end,
            )
        )
    absences = {
        (str(item["staff_id"]), parse_iso_date(item["date"]))
        for item in payload.get("absences") or []
    }
    for staff_id, days in (payload.get("availability") or {}).items():
        for day, status in days.items():
            if status == "unavailable":
                absences.add((str(staff_id), parse_iso_date(day)))
    available_only: dict[str, set] = {}
    for staff_id in list(payload.get("part_time_staff_ids") or []) + list(
        payload.get("tick_only_staff_ids") or []
    ):
        days = (payload.get("availability") or {}).get(str(staff_id), {})
        available_only[str(staff_id)] = {
            parse_iso_date(day) for day, status in days.items() if status == "available"
        }
    extra_roles = [
        (str(item["staff_id"]), item["role"], item["start"], item["end"])
        for item in payload.get("extra_roles") or []
    ]
    return History(
        staff=staff,
        shifts=shifts,
        absences=absences,
        available_only=available_only,
        admin_primary_ids={str(item) for item in payload.get("admin_primary_staff_ids") or []},
        prefer_five_day_ids={str(item) for item in payload.get("prefer_five_day_staff_ids") or []},
        extra_roles=extra_roles,
        exclude_foh_ids={str(item) for item in payload.get("exclude_foh_staff_ids") or []},
        extra_foh_ids={str(item) for item in payload.get("extra_foh_staff_ids") or []},
        max_shifts={str(staff_id): int(limit) for staff_id, limit in (payload.get("max_shifts") or {}).items()},
        inactive_ids={str(item) for item in payload.get("inactive_staff_ids") or []},
    )


def _role_fields(item: dict) -> tuple[str, str, str]:
    if "role_text" in item:
        return parse_role_text(item["role_text"])
    return item["start"], item["end"], item["role"]
