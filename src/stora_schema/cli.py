from __future__ import annotations

import argparse
import sys
from pathlib import Path

from stora_schema.format_plan import format_plan
from stora_schema.safety import SafetyError, write_drafts
from stora_schema.solver import build_plan
from stora_schema.store import load_history


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Build an unpublished weekly draft. Never edits existing schedules or publishes."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    plan_cmd = sub.add_parser("plan", help="Generate a local draft for an empty week")
    plan_cmd.add_argument("--history", required=True, help="JSON snapshot of staff + recent shifts")
    plan_cmd.add_argument("--week", required=True, help="Any date in the target week, YYYY-MM-DD")
    plan_cmd.add_argument("--out", help="Optional markdown file to write")
    plan_cmd.add_argument(
        "--write-drafts",
        action="store_true",
        help="Attempt to upload new unpublished drafts only. Existing shifts are never changed.",
    )

    args = parser.parse_args(argv)
    if args.command == "plan":
        return _plan(args)
    return 1


def _plan(args) -> int:
    history = load_history(args.history)
    plan = build_plan(history, args.week)
    text = format_plan(plan)
    print(text)
    if args.out:
        path = Path(args.out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    if args.write_drafts:
        try:
            write_drafts(history, plan)
        except SafetyError as exc:
            print(str(exc), file=sys.stderr)
            return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
