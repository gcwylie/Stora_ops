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
    return History(staff=staff, shifts=shifts, absences=absences)


def _role_fields(item: dict) -> tuple[str, str, str]:
    if "role_text" in item:
        return parse_role_text(item["role_text"])
    return item["start"], item["end"], item["role"]
