# stora-schema

Local planner for **Stora Bageriet**. It builds each week from scratch, infers coverage from the latest scheduled week, and shares **weekend days** as evenly as it can.

It does **not** change weeks that already have shifts, and it does **not** publish. Publishing stays manual in Personalkollen.

## Safety

- If the target week already has shifts, planning stops. Nothing is replaced.
- Every generated shift is an unpublished draft (`published: false`).
- `--write-drafts` is refused until an uploader is added. Even then it will only run on an empty week.

## How it decides

1. Read a JSON snapshot of staff and recent shifts.
2. Take the **latest complete week** as the coverage template (how many of each grundpass per weekday, with those times).
3. Assign **different people** onto that shape.
4. Eligible people are those who already worked that role, or who belong to the matching staff group (Bageri, FOH, Kitchen, …).
5. Weekend slots go first to people who have had fewer Saturday/Sunday days in the snapshot history.

## Usage

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
python -m stora_schema plan --history data/snapshots/history.json --week 2026-08-31
```

`--week` can be any date in the empty week. Week 36 (31 Aug–6 Sep 2026) was empty when this project was created.

## Snapshot format

`data/snapshots/` is gitignored (live staff data). Example:

```json
{
  "staff": [{"id": "123", "name": "Ada", "groups": ["Bageri"]}],
  "shifts": [{"staff_id": "123", "date": "2026-08-24", "role_text": "03:00 – 11:30 Avbak"}],
  "absences": []
}
```
