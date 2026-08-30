from __future__ import annotations

from stora_schema.models import Plan

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def format_plan(plan: Plan) -> str:
    new_count = sum(1 for item in plan.assignments if not item.locked)
    locked_count = sum(1 for item in plan.assignments if item.locked)
    lines = [
        f"# Draft week {plan.monday.isocalendar().week} · {plan.monday.isoformat()} – {plan.sunday.isoformat()}",
        "",
        f"Kept {locked_count} existing shift(s) unchanged. {new_count} new unpublished draft(s). Nothing was published.",
        "",
    ]
    current = None
    for item in plan.assignments:
        if item.day != current:
            if current is not None:
                lines.append("")
            current = item.day
            lines.append(f"## {WEEKDAYS[item.day.weekday()]} {item.day.isoformat()}")
            lines.append("")
        marker = "already scheduled" if item.locked else "draft"
        lines.append(f"- {item.start}–{item.end}  {item.role:<22}  {item.staff_name}  ({marker})")
    if plan.unfilled:
        lines.extend(["", "## Unfilled", ""])
        for slot in plan.unfilled:
            lines.append(f"- {slot.day.isoformat()} {slot.start}–{slot.end} {slot.role}")
    if plan.weekend_counts:
        lines.extend(["", "## Weekend days after this draft (history + this week)", ""])
        for name, count in sorted(plan.weekend_counts.items(), key=lambda pair: (-pair[1], pair[0])):
            lines.append(f"- {name}: {count}")
    lines.append("")
    return "\n".join(lines)
