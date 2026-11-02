# Stora ops

Operations app for **Stora Bageriet**: weekly staff schedule, daily sales, and stock counts for two shops.

| Code | Shop | Address |
| --- | --- | --- |
| SE88 | St Eriksgatan | Sankt Eriksgatan 88 |
| SIB2 | Östermalm | Sibyllegatan 2 |

Gast Café (RAD57) is not part of this app. The old planner’s `vasastan` key is St Eriksgatan.

Graeme is the admin and sees both shops. A shop manager sees only their shop. The screens are built for a phone as well as a laptop: the same DM Sans type and navy / brand-blue palette as the local planner.

## What you can do

- **Översikt** — labour % for the week and the month so far (FOH + kitchen, loaded), sales against last year and against the yearly target, low-stock and count-overdue alerts.
- **Schema** — the weekly planner. Named shifts, per-person kr/h, Personal and Pass views, FOH coverage on Östermalm (7 Mon–Thu, 9 Fri–Sun), labour sheet, export, and **Send to Caspeco**.
- **Försäljning** — type a day’s sales excl. and incl. VAT. The year view, remaining-day pace, and wage % update from that. History imports from `sales-days.json`.
- **Lager** — count a shop on a phone (categories, two units, sanity checks, review, value by category, Excel). Every submitted count is kept, so you get stock value over time, usage between counts, and a suggested order grouped by supplier.
- **Staff** — admin only. Roster, group, home shop, kr/h, salary flag, Caspeco employee id.

Labour rules, unchanged from the local planner:

- Cost = hours × kr/h × 1.12 holiday pay × 1.3142 employer social fees (31.42%).
- Labour % is FOH + kitchen only. Bakery and admin are shown apart. Salary people (bakers, Graeme) cost nothing until a kr/h is typed.
- Target FOH hours = target sales × 21% ÷ loaded FOH kr/h. Target sales is last year’s same weekday × the yearly target (default +10%).
- If this year’s sales for a day are missing, the sheet uses last year’s same weekday of the same ISO week.

Suggested orders are the drop in ordering units between the last two submitted counts. The catalogue has no par levels. A count that went up (a delivery) suggests nothing. Low stock means the latest count is zero, or what is left is under half of what was used since the previous count. A shop with no submitted count in 7 days is overdue.

## Stack

Next.js, Postgres, Prisma, and a signed login cookie. No Supabase project and no third-party login. One Node process and one database is enough for a handful of people, and it can sit on a small VPS.

The sales table has a `source` column (`manual`, `import`, `demo`, and later `caspeco`). A future Caspeco sales feed should upsert `SalesDay` rows. It should not add a second set of numbers. That feed is not built here.

The Python draft solver in `src/stora_schema` is unchanged. It is not the hosted app. The old single-page planner is still in `web/` if you need it on a Mac without the database.

## Run it locally

You need Node 22 and Postgres 16. Docker is the easy database:

```bash
docker compose up -d db
cd ops
cp .env.example .env
npm ci
npx prisma migrate deploy
npx prisma db seed
npm test
npm run dev
```

Open http://localhost:3000.

Demo logins (only when `SEED_DEMO=1`, which is the local default):

| Email | Password | Sees |
| --- | --- | --- |
| graeme@stora.local | stora-demo | both shops |
| sib.manager@stora.local | stora-demo | Östermalm |
| se.manager@stora.local | stora-demo | St Eriksgatan |

Change these before anyone else can reach the machine. The demo roster, sales, and catalogue are fake. Items numbered 9000 and up are the demo catalogue.

Without Docker, create a database and set `DATABASE_URL` in `ops/.env` to match.

`npm test` in `ops/` checks labour cost, labour %, stock conversions, stock value, sanity limits, and the sales import. From the repo root, `pytest` still runs the old solver.

## Deploy

Nothing in this repo deploys itself. A typical cheap host is one VPS with the Compose file.

1. Copy the repo onto the server.
2. Create a `.env` next to `docker-compose.yml` (not the one inside `ops/`):

```bash
POSTGRES_PASSWORD=a-long-random-password
AUTH_SECRET=another-long-random-string
ADMIN_EMAIL=graeme@stora.local
ADMIN_PASSWORD=choose-a-real-password
ADMIN_NAME=Graeme
APP_URL=https://schema.example.se
SEED_DEMO=0
CASPECO_TOKEN=optional-shared-secret
```

3. Start the database and the app:

```bash
docker compose --profile full up -d --build
```

The container runs migrations, then `prisma/seed.ts`. With `SEED_DEMO=0` the seed only ensures labour settings and the admin user. It does not load fake sales or the demo catalogue. The admin user is created only if that email does not exist yet. Later deploys do not reset the password.

Put Caddy or nginx in front for HTTPS, proxying to port 3000. The phone counts need HTTPS if you are not on the same LAN.

You can also run the Node app yourself and point `DATABASE_URL` at any Postgres (a VPS, or Supabase’s direct connection string on port 5432 for migrations). Same commands as local, with `SEED_DEMO=0`.

```bash
cd ops
npm ci
npx prisma migrate deploy
SEED_DEMO=0 npx prisma db seed
npm run build
npm start
```

## Import the private files

These files stay out of git. Run the importers on a machine that has `ops/.env` and the files. From `ops/`:

```bash
npm run import:sales -- /path/to/web/sales-days.json
npm run import:employees -- /path/to/web/employees.json
npm run import:rates -- /path/to/web/staff-rates.json
npm run import:catalogue -- /path/to/stock-catalogue.json --replace
```

- **sales-days.json** — same shape the old `sales.js` reads. `ostermalm` becomes SIB2, `vasastan` becomes SE88. Incl. VAT keys are `*_incl`. Any other site, including Gast, is dropped. Daily rows and `periods` are both stored. A period and a daily row for the same days are both added, which is what the old screen did, so don’t overlap them in the file.
- **employees.json** — either `{ "Full Name": "caspecoId" }` or `{ "employees": [{ "name", "caspecoId", "group", "shop", "alsoShop", "salary", "hourlyRate" }] }`. A bare map updates Caspeco ids on people who already exist, and creates anyone new as FOH with shop `UNASSIGNED`. Set their shop and group on the Staff screen before they show on a rota.
- **staff-rates.json** — `fohAvg`, `kitchenAvg`, `bakeryAvg`, `targetFohPct`, `semesterPct`, `agaPct` (or the older `onCostPct`), `hourly` by name, and `salary` as a list of names. Names that are not on the roster are skipped.
- **Catalogue** — the stock-count JSON (`items`, `limits`, `maxUnits`, `valueCap`). Only SE88 and SIB2 are kept. `--replace` deletes catalogue rows that are not in the file and have never been counted, which is how you drop the demo items.

Importing again overwrites the same dates, people, and item numbers.

## Manager logins

```bash
cd ops
npm run user:create -- --email manager.ostermalm@example.com --name "Östermalm" --password "at-least-8" --role MANAGER --shop SIB2
npm run user:create -- --email manager.erik@example.com --name "St Erik" --password "at-least-8" --role MANAGER --shop SE88
```

`--shop` is `SE88` or `SIB2`. Running it again for the same email sets a new password. To reset Graeme:

```bash
npm run user:create -- --email graeme@stora.local --name "Graeme" --password "a-new-password" --role ADMIN
```

## Caspeco draft shifts

Send to Caspeco still does not publish. Schema queues the week. Drag **Send queued week** to the bookmarks bar, open Caspeco while you are logged in, and click the bookmark. The bridge is the same one as `web/caspeco-bridge.js`: it creates unpublished drafts and skips a person who already has a shift that day.

Station ids are unchanged. Östermalm: Bakery 6, Kitchen 4, FOH 5, Admin 9. St Eriksgatan FOH: 13. The “already working” check uses stations 3, 4, 5, 6, 8, 9 at Östermalm and 11, 12, 13, 14, 16, 17 at St Eriksgatan.

People without a Caspeco id are listed and skipped. Set the id on Staff, or import `employees.json`.

If `CASPECO_TOKEN` is set, the bookmark only works when it was dragged from this app while that token was set. Leave it empty on a machine that is not on the internet. On a public URL, set it, because the queued week contains names and shift times.

There is one queued week at a time, same as the old `pending-send.json`.

## Old planner

`web/` is the previous single-user page. `src/stora_schema` still plans unpublished drafts from a Personalkollen snapshot and refuses to touch a week that already has shifts. See the commands in the history of this file, or run:

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
pytest
python -m stora_schema plan --history data/snapshots/history.json --week 2026-08-31
```
