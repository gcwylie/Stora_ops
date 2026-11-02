/* Loaded from a bookmark while you are logged in to Caspeco. */
(async function storaSendToCaspeco() {
  const origin = "http://127.0.0.1:8777";
  function toast(text, ok) {
    let el = document.getElementById("stora-schema-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "stora-schema-toast";
      el.style.cssText =
        "position:fixed;z-index:99999;right:16px;bottom:16px;max-width:360px;padding:14px 16px;border-radius:16px;font:14px/1.4 DM Sans,sans-serif;color:#fff;";
      document.body.appendChild(el);
    }
    el.style.background = ok ? "#0a1138" : "#dc3131";
    el.textContent = text;
  }

  try {
    const pending = await fetch(origin + "/api/pending?t=" + Date.now()).then((r) => r.json());
    const shifts = pending && pending.shifts;
    if (!shifts || !shifts.length) {
      toast("No week queued. Click Send to Caspeco in Stora schema first.", false);
      return;
    }

    if (!window.__wpRequire) {
      window.webpackChunkwebplatform.push([
        ["__stora_bridge_" + Date.now()],
        {},
        function (r) {
          window.__wpRequire = r;
        },
      ]);
    }
    const api = window.__wpRequire(89491).A;
    const siteStations = pending.site === "vasastan"
      ? [11, 12, 13, 14, 16, 17]
      : [3, 4, 5, 6, 8, 9];
    const from = pending.monday + "T00:00:00.000Z";
    const toDate = new Date(pending.monday + "T00:00:00.000Z");
    toDate.setUTCDate(toDate.getUTCDate() + 7);
    const to = toDate.toISOString();
    const qs =
      "fromDateInclusive=" +
      encodeURIComponent(from) +
      "&toDateExclusive=" +
      encodeURIComponent(to) +
      "&stationIds=" +
      encodeURIComponent(siteStations.join(",")) +
      "&checkIfAlreadyWorking=true";
    const existingRes = await api.getAsync("scheduleshifts/shifts?" + qs, (e) => e);
    const existing = existingRes.scheduleShifts || [];
    const seen = new Set(existing.map((s) => [s.employeeId, String(s.date).slice(0, 10)].join("|")));

    let created = 0;
    let skipped = 0;
    const errors = [];
    for (const shift of shifts) {
      const key = [shift.employeeId, shift.date].join("|");
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      try {
        await api.createShiftAsync({
          employeeId: shift.employeeId,
          employmentId: shift.employmentId || shift.employeeId,
          stationId: shift.stationId,
          date: shift.date,
          inTime: shift.inTime,
          outTime: shift.outTime,
          shiftType: 2,
          breakType: 4,
          comment: shift.comment,
        });
        seen.add(key);
        created += 1;
      } catch (err) {
        let detail = "";
        try {
          detail = err && err.message ? err.message : JSON.stringify(err);
        } catch (unused) {
          detail = String(err);
        }
        errors.push(shift.name + ": " + detail);
      }
    }

    const bits = [
      "Week " + pending.week + " · " + pending.site,
      created + " new unpublished drafts",
      skipped + " already in Caspeco",
    ];
    if (pending.unmatched && pending.unmatched.length) {
      bits.push("Not in Caspeco: " + pending.unmatched.join(", "));
    }
    if (errors.length) bits.push("Errors: " + errors.slice(0, 3).join("; "));
    toast(bits.join(". "), errors.length === 0);
  } catch (err) {
    toast("Could not send. Is Stora schema running on port 8777, and are you logged in to Caspeco? " + err, false);
  }
})();
