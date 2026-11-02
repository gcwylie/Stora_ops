const SALES_TODAY = "2026-11-01";
const SALES_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SALES_WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function salesSek(kr) {
  const sign = kr < 0 ? "−" : "";
  const abs = Math.abs(kr);
  const grouped = Math.round(abs)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return `${sign}${grouped}\u00a0kr`;
}

function salesPct(n) {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

function salesYmd(date) {
  return date.toISOString().slice(0, 10);
}

function salesParseDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function salesAddDays(iso, n) {
  const dt = salesParseDay(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return salesYmd(dt);
}

function salesDayLabel(iso) {
  return `${Number(iso.slice(8, 10))} ${SALES_MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
}

function salesWeekday(iso) {
  return SALES_WD[salesParseDay(iso).getUTCDay()];
}

function salesHistCell(iso, ore) {
  const stamp = `${salesWeekday(iso)} ${salesDayLabel(iso)}`;
  if (!ore) return `Closed<span class="sales-cmp-date">${stamp}</span>`;
  return `${salesSek(ore / 100)}<span class="sales-cmp-date">${stamp}</span>`;
}

function salesVatMode() {
  return document.querySelector("#salesVat .pill.active")?.dataset.vat || "excl";
}

function salesShopValue(row, shop, vat) {
  if (!row) return 0;
  const suffix = vat === "incl" ? "_incl" : "";
  if (shop === "both") return (row[`ostermalm${suffix}`] || 0) + (row[`vasastan${suffix}`] || 0);
  return row[`${shop}${suffix}`] || 0;
}

function salesLoadTarget(data) {
  const stored = localStorage.getItem("stora.yearlyTargetPct");
  if (stored != null && stored !== "") return Number(stored);
  return Number(data.settings?.yearlyTargetPct ?? 10);
}

const salesSettings = { yearlyTargetPct: 10, staffCosts: {} };

function salesSaveSettings() {
  localStorage.setItem("stora.yearlyTargetPct", String(salesSettings.yearlyTargetPct));
  localStorage.setItem("stora.staffCosts", JSON.stringify(salesSettings.staffCosts));
  fetch("/api/sales-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(salesSettings),
  }).catch(() => {});
}

function salesSaveTarget(pct) {
  salesSettings.yearlyTargetPct = pct;
  salesSaveSettings();
}

function salesParseKr(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/kr$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function salesStaffRow(monthKey) {
  return salesSettings.staffCosts[monthKey] || {};
}

function salesStaffCost(monthKey, shop) {
  const row = salesStaffRow(monthKey);
  if (shop === "both") {
    const split = (row.ostermalm || 0) + (row.vasastan || 0);
    return split || row.both || 0;
  }
  return row[shop] || 0;
}

function salesSetStaffCost(monthKey, shop, kr) {
  const row = { ...salesStaffRow(monthKey) };
  if (shop === "both") {
    row.both = kr;
    delete row.ostermalm;
    delete row.vasastan;
  } else {
    row[shop] = kr;
    delete row.both;
  }
  if (!kr && shop === "both") delete row.both;
  if (!kr && shop !== "both") delete row[shop];
  if (!row.ostermalm && !row.vasastan && !row.both) delete salesSettings.staffCosts[monthKey];
  else salesSettings.staffCosts[monthKey] = row;
  salesSaveSettings();
}

function salesWagePct(costKr, salesOre) {
  if (!costKr || !salesOre) return null;
  return (costKr / (salesOre / 100)) * 100;
}

function salesWageLabel(pct) {
  if (pct == null) return "—";
  return `${pct.toFixed(1)}%`;
}

function salesMonthKey(iso) {
  return iso.slice(0, 7);
}

function salesBuildIndex(data) {
  const days = data.days || {};
  const periods = data.periods || [];
  const month = {};
  Object.entries(days).forEach(([iso, row]) => {
    const key = salesMonthKey(iso);
    if (!month[key]) month[key] = { ostermalm: 0, vasastan: 0, ostermalm_incl: 0, vasastan_incl: 0 };
    month[key].ostermalm += row.ostermalm || 0;
    month[key].vasastan += row.vasastan || 0;
    month[key].ostermalm_incl += row.ostermalm_incl || 0;
    month[key].vasastan_incl += row.vasastan_incl || 0;
  });
  periods.forEach((period) => {
    const key = period.from.slice(0, 7);
    if (!month[key]) month[key] = { ostermalm: 0, vasastan: 0, ostermalm_incl: 0, vasastan_incl: 0 };
    month[key].ostermalm += period.ostermalm || 0;
    month[key].vasastan += period.vasastan || 0;
    month[key].ostermalm_incl += period.ostermalm_incl || 0;
    month[key].vasastan_incl += period.vasastan_incl || 0;
  });
  return { days, periods, month };
}

function salesYearTotal(index, year, shop, vat) {
  let sum = 0;
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    sum += salesShopValue(index.month[key], shop, vat);
  }
  return sum;
}

function salesYtd(index, throughIso, shop, vat) {
  let sum = 0;
  Object.entries(index.days).forEach(([iso, row]) => {
    if (iso <= throughIso && iso.startsWith(throughIso.slice(0, 4))) {
      sum += salesShopValue(row, shop, vat);
    }
  });
  index.periods.forEach((period) => {
    if (period.to <= throughIso && period.from.startsWith(throughIso.slice(0, 4))) {
      sum += salesShopValue(period, shop, vat);
    }
  });
  return sum;
}

function salesRemainingDays(fromIso, year) {
  const last = `${year}-12-31`;
  const out = [];
  let cursor = fromIso;
  while (cursor <= last) {
    out.push(cursor);
    cursor = salesAddDays(cursor, 1);
  }
  return out;
}

function salesRender(data) {
  const index = salesBuildIndex(data);
  const year = 2026;
  const prior = year - 1;
  const shop = document.querySelector("#salesShops .pill.active")?.dataset.shop || "both";
  const vat = salesVatMode();
  const vatLabel = vat === "incl" ? "incl. VAT" : "excl. VAT";
  const target = Number(document.getElementById("salesTarget").value || 10);
  const lastYear = salesYearTotal(index, prior, shop, vat);
  const lastYtd = salesYtd(index, `${prior}-10-31`, shop, vat);
  const thisYtd = salesYtd(index, "2026-10-31", shop, vat);
  const yearTarget = lastYear * (1 + target / 100);
  const remainingNeeded = Math.max(0, yearTarget - thisYtd);
  const remaining = salesRemainingDays(SALES_TODAY, year);
  const lastRemaining = remaining.reduce((sum, iso) => {
    const priorIso = `${prior}${iso.slice(4)}`;
    return sum + salesShopValue(index.days[priorIso], shop, vat);
  }, 0);
  const pace = remaining.length ? remainingNeeded / remaining.length : 0;
  const restPct =
    lastRemaining > 0 ? (remainingNeeded / lastRemaining - 1) * 100 : null;
  const ytdPct = lastYtd > 0 ? ((thisYtd - lastYtd) / lastYtd) * 100 : null;

  document.getElementById("salesYtd").textContent = salesSek(thisYtd / 100);
  document.getElementById("salesYtdLabel").textContent = `2026 to 31 Oct, ${vatLabel}`;
  document.getElementById("salesLastYtd").textContent = `${salesSek(lastYtd / 100)} last year to 31 Oct`;
  document.getElementById("salesYtdPct").textContent = salesPct(ytdPct);
  document.getElementById("salesYtdPct").dataset.tone = ytdPct >= 0 ? "up" : "down";
  document.getElementById("salesTargetKr").textContent = salesSek(yearTarget / 100);
  document.getElementById("salesNeed").textContent = salesSek(remainingNeeded / 100);
  document.getElementById("salesPace").textContent = salesSek(pace / 100);
  document.getElementById("salesRestHint").textContent =
    lastRemaining > 0
      ? `Last year Nov–Dec was ${salesSek(lastRemaining / 100)} for this shop view. To hit +${target}% on the full year you need to be ${salesPct(restPct)} on the remaining days, about ${salesSek(pace / 100)} per open day.`
      : `Set a yearly target to see the remaining-day pace.`;

  const y2023 = salesYearTotal(index, 2023, shop, vat);
  const y2024 = salesYearTotal(index, 2024, shop, vat);
  const y2025 = salesYearTotal(index, 2025, shop, vat);
  document.getElementById("salesYearStats").innerHTML = [
    [salesSek(y2023 / 100), "2023 full year"],
    [salesSek(y2024 / 100), `2024 · ${salesPct(y2023 ? ((y2024 - y2023) / y2023) * 100 : null)} vs 2023`],
    [salesSek(y2025 / 100), `2025 · ${salesPct(y2024 ? ((y2025 - y2024) / y2024) * 100 : null)} vs 2024`],
    [salesSek(thisYtd / 100), "2026 to 31 Oct"],
  ]
    .map(([value, label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`)
    .join("");

  const historyYears = [2023, 2024, 2025, 2026];
  const maxMonth = Math.max(
    ...Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, "0");
      return Math.max(...historyYears.map((y) => salesShopValue(index.month[`${y}-${mm}`], shop, vat)));
    }),
    1,
  );

  const monthRows = [];
  const bars = [];
  for (let i = 0; i < 12; i += 1) {
    const mm = String(i + 1).padStart(2, "0");
    const v23 = salesShopValue(index.month[`2023-${mm}`], shop, vat);
    const v24 = salesShopValue(index.month[`2024-${mm}`], shop, vat);
    const a = salesShopValue(index.month[`${prior}-${mm}`], shop, vat);
    const b = salesShopValue(index.month[`${year}-${mm}`], shop, vat);
    const future = `${year}-${mm}` >= SALES_TODAY.slice(0, 7) && b === 0;
    const projected = future ? a * (1 + target / 100) : b;
    const cmp = future ? projected : b;
    const pct = a ? ((cmp - a) / a) * 100 : null;
    monthRows.push([
      SALES_MONTHS[i],
      salesSek(v23 / 100),
      salesSek(v24 / 100),
      salesSek(a / 100),
      future ? `${salesSek(projected / 100)} proj.` : salesSek(b / 100),
      salesPct(pct),
    ]);
    bars.push(`<div class="sales-bar-row">
      <span>${SALES_MONTHS[i].slice(0, 3)}</span>
      <div class="sales-bar-track">
        <div class="sales-bar y23" style="width:${(v23 / maxMonth) * 100}%"></div>
        <div class="sales-bar y24" style="width:${(v24 / maxMonth) * 100}%"></div>
        <div class="sales-bar last" style="width:${(a / maxMonth) * 100}%"></div>
        <div class="sales-bar now${future ? " proj" : ""}" style="width:${(cmp / maxMonth) * 100}%"></div>
      </div>
    </div>`);
  }
  const table = document.getElementById("salesMonthTable");
  table.innerHTML = `
    <thead><tr><th>Month</th><th>2023</th><th>2024</th><th>2025</th><th>2026</th><th>vs 2025</th></tr></thead>
    <tbody>${monthRows
      .map(
        (row, i) =>
          `<tr class="${`${year}-${String(i + 1).padStart(2, "0")}` >= SALES_TODAY.slice(0, 7) && salesShopValue(index.month[`${year}-${String(i + 1).padStart(2, "0")}`], shop, vat) === 0 ? "proj" : ""}">${row
            .map((cell, idx) => `<td${idx ? ' class="num"' : ""}>${cell}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</tbody>`;
  document.getElementById("salesBars").innerHTML = `${bars.join("")}
    <p class="sales-legend">Grey 2023 · light 2024 · mid 2025 · blue 2026</p>`;

  const dayRows = remaining.map((iso) => {
    const d23 = `2023${iso.slice(4)}`;
    const d24 = `2024${iso.slice(4)}`;
    const d25 = `2025${iso.slice(4)}`;
    const last = salesShopValue(index.days[d25], shop, vat);
    const y24 = salesShopValue(index.days[d24], shop, vat);
    const y23 = salesShopValue(index.days[d23], shop, vat);
    const plus = last * (1 + target / 100);
    return `<tr${last ? "" : ' class="closed"'}>
      <td>${salesDayLabel(iso)}</td>
      <td>${salesWeekday(iso)}</td>
      <td class="num">${salesHistCell(d23, y23)}</td>
      <td class="num">${salesHistCell(d24, y24)}</td>
      <td class="num">${salesHistCell(d25, last)}</td>
      <td class="num">${last ? salesSek(plus / 100) : "Closed"}</td>
      <td class="num">${last ? salesSek(pace / 100) : "—"}</td>
    </tr>`;
  });
  document.getElementById("salesDaysTable").innerHTML = `
    <thead><tr><th>Date</th><th></th><th>2023</th><th>2024</th><th>2025</th><th>If +${target}%</th><th>Pace</th></tr></thead>
    <tbody>${dayRows.join("")}</tbody>`;

  salesRenderWage(index, shop);
}

function salesRenderWage(index, shop) {
  const years = [2025, 2026];
  let ytdCost = 0;
  let ytdSales = 0;
  let lastMonth = null;
  const body = [];
  for (let i = 0; i < 12; i += 1) {
    const mm = String(i + 1).padStart(2, "0");
    const cells = [`<td>${SALES_MONTHS[i]}</td>`];
    years.forEach((year) => {
      const key = `${year}-${mm}`;
      const salesOre = salesShopValue(index.month[key], shop, "excl");
      const costKr = salesStaffCost(key, shop);
      const pct = salesWagePct(costKr, salesOre);
      if (year === 2026 && key < SALES_TODAY.slice(0, 7) && costKr && salesOre) {
        ytdCost += costKr;
        ytdSales += salesOre;
        lastMonth = { key, pct, costKr, salesOre };
      }
      cells.push(`<td class="num">${salesOre ? salesSek(salesOre / 100) : "—"}</td>`);
      cells.push(
        `<td class="num"><input class="wage-input" data-month="${key}" inputmode="decimal" placeholder="—" value="${costKr ? costKr.toLocaleString("sv-SE") : ""}"></td>`,
      );
      cells.push(`<td class="num">${salesWageLabel(pct)}</td>`);
    });
    body.push(`<tr>${cells.join("")}</tr>`);
  }

  let y25Cost = 0;
  let y25Sales = 0;
  for (let i = 1; i <= 10; i += 1) {
    const key = `2025-${String(i).padStart(2, "0")}`;
    const costKr = salesStaffCost(key, shop);
    const salesOre = salesShopValue(index.month[key], shop, "excl");
    if (costKr && salesOre) {
      y25Cost += costKr;
      y25Sales += salesOre;
    }
  }
  const ytdPct = salesWagePct(ytdCost, ytdSales);
  const y25Pct = salesWagePct(y25Cost, y25Sales);
  const lastPct = lastMonth?.pct ?? null;
  document.getElementById("salesWageYtd").textContent = salesWageLabel(ytdPct);
  document.getElementById("salesWageStats").innerHTML = [
    [salesWageLabel(ytdPct), "2026 wage % on months with a cost"],
    [salesWageLabel(y25Pct), "2025 Jan–Oct on months with a cost"],
    [lastPct != null ? salesWageLabel(lastPct) : "—", lastMonth ? `Last filled month · ${SALES_MONTHS[Number(lastMonth.key.slice(5)) - 1]}` : "Last filled month"],
    [ytdCost ? salesSek(ytdCost) : "—", "2026 staff cost entered"],
  ]
    .map(([value, label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`)
    .join("");

  const table = document.getElementById("salesWageTable");
  table.innerHTML = `
    <thead><tr>
      <th>Month</th>
      <th class="num">2025 sales</th><th class="num">2025 cost</th><th class="num">2025 %</th>
      <th class="num">2026 sales</th><th class="num">2026 cost</th><th class="num">2026 %</th>
    </tr></thead>
    <tbody>${body.join("")}</tbody>`;
  table.querySelectorAll(".wage-input").forEach((input) => {
    input.addEventListener("change", () => {
      salesSetStaffCost(input.dataset.month, shop, salesParseKr(input.value));
      salesRenderWage(index, shop);
    });
  });
}

async function salesInit() {
  const res = await fetch("sales-days.json");
  const data = await res.json();
  try {
    const setRes = await fetch("/api/sales-settings");
    if (setRes.ok) {
      const file = await setRes.json();
      if (file.staffCosts && typeof file.staffCosts === "object") {
        salesSettings.staffCosts = file.staffCosts;
      }
      if (file.yearlyTargetPct != null) salesSettings.yearlyTargetPct = Number(file.yearlyTargetPct);
    }
  } catch (err) {}
  try {
    const local = localStorage.getItem("stora.staffCosts");
    if (local) salesSettings.staffCosts = { ...salesSettings.staffCosts, ...JSON.parse(local) };
  } catch (err) {}
  const target = salesLoadTarget(data);
  salesSettings.yearlyTargetPct = target;
  document.getElementById("salesTarget").value = String(target);
  document.getElementById("salesTargetLabel").textContent = `${target}%`;
  const storedVat = localStorage.getItem("stora.vatMode");
  if (storedVat === "incl" || storedVat === "excl") {
    document.querySelectorAll("#salesVat .pill").forEach((el) => {
      el.classList.toggle("active", el.dataset.vat === storedVat);
    });
  }
  document.querySelectorAll("#salesShops .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#salesShops .pill").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      salesRender(data);
    });
  });
  document.querySelectorAll("#salesVat .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#salesVat .pill").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      localStorage.setItem("stora.vatMode", btn.dataset.vat);
      salesRender(data);
    });
  });
  document.getElementById("salesTarget").addEventListener("input", (ev) => {
    const pct = Number(ev.target.value);
    document.getElementById("salesTargetLabel").textContent = `${pct}%`;
    salesSaveTarget(pct);
    salesRender(data);
  });
  salesRender(data);
}

function salesSetView(view) {
  const sales = view === "sales";
  document.getElementById("schemaMain").style.display = sales ? "none" : "block";
  document.getElementById("salesMain").style.display = sales ? "block" : "none";
  document.getElementById("schemaTools").style.display = sales ? "none" : "contents";
  document.getElementById("salesTools").style.display = sales ? "flex" : "none";
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === view);
  });
  document.title = sales ? "Stora försäljning" : "Stora schema";
}

document.querySelectorAll("[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => salesSetView(btn.dataset.view));
});
salesInit().catch((err) => {
  const hint = document.getElementById("salesHint");
  if (hint) hint.textContent = `Could not load sales-days.json. ${err.message}`;
});
