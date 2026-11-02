# stora-schema

Local planner for **Stora Bageriet**. It builds each week from scratch, infers coverage from the latest scheduled week, and shares **weekend days** as evenly as it can.

It does **not** change weeks that already have shifts, and it does **not** publish. Publishing stays manual in Personalkollen.

## Safety

- If the target week already has shifts, planning stops. Nothing is replaced.
- Every generated shift is an unpublished draft (`published: false`).
- `--write-drafts` is refused until an uploader is added. Even then it will only run on an empty week.

## How it decides

1. Read a JSON snapshot of staff and recent shifts.
2. Take the **latest complete week** as the bakery/kitchen/admin template. Stora FOH uses a fixed daily pattern instead.
3. Assign **different people** onto that shape.
4. Eligible people belong to the matching staff group (Bageri, FOH Full Time, Kitchen, …).
5. **Stora FOH** is always: 1 AM, 1 PM, 1 Runner AM, 2 PM Runner, 2 PM Runner Close. Sankt Eriksgatan and GAST COVER are skipped.
6. Five-day FOH (consecutive days off): Buster, Graeme, Maya, Mika, Sophie, Stella, Svea, Thea, Ella Onyango. Graeme is ADMIN / Bordspasset 08:00–16:30, not FOH floor.
7. Everyone else on FOH is 2–3 shifts. Tilde Gottberg, Katherine, Valentina, and Tom do not work FOH. Viggo works one shift, and only on a green tick.
8. Red availability crosses are treated as absences. Part-time people (Edwin, Kalle) are only used on green-tick days.
9. Weekend slots go first to people who have had fewer Saturday/Sunday days in the snapshot history.

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
