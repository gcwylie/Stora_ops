import { CASPECO_SITE_STATIONS } from "@/lib/shifts";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const body = `/* Loaded from a bookmark while you are logged in to Caspeco. */
(async function storaSendToCaspeco() {
  var script = document.currentScript;
  var origin = new URL(script && script.src ? script.src : ${JSON.stringify(new URL(request.url).origin)}).origin;
  var token = ${JSON.stringify(token)};
  function toast(text, ok) {
    var el = document.getElementById("stora-schema-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "stora-schema-toast";
      el.style.cssText = "position:fixed;z-index:99999;right:16px;bottom:16px;max-width:360px;padding:14px 16px;border-radius:16px;font:14px/1.4 DM Sans,sans-serif;color:#fff;";
      document.body.appendChild(el);
    }
    el.style.background = ok ? "#0a1138" : "#dc3131";
    el.textContent = text;
  }
  try {
    var pending = await fetch(origin + "/api/caspeco/pending?token=" + encodeURIComponent(token) + "&t=" + Date.now()).then(function (r) { return r.json(); });
    var shifts = pending && pending.shifts;
    if (!shifts || !shifts.length) {
      toast("No week queued. Click Send to Caspeco in Stora schema first.", false);
      return;
    }
    if (!window.__wpRequire) {
      window.webpackChunkwebplatform.push([["__stora_bridge_" + Date.now()], {}, function (r) { window.__wpRequire = r; }]);
    }
    var api = window.__wpRequire(89491).A;
    var siteStations = pending.site === "SE88" || pending.site === "vasastan" ? ${JSON.stringify(CASPECO_SITE_STATIONS.SE88)} : ${JSON.stringify(CASPECO_SITE_STATIONS.SIB2)};
    var from = pending.monday + "T00:00:00.000Z";
    var toDate = new Date(pending.monday + "T00:00:00.000Z");
    toDate.setUTCDate(toDate.getUTCDate() + 7);
    var to = toDate.toISOString();
    var qs = "fromDateInclusive=" + encodeURIComponent(from) + "&toDateExclusive=" + encodeURIComponent(to) + "&stationIds=" + encodeURIComponent(siteStations.join(",")) + "&checkIfAlreadyWorking=true";
    var existingRes = await api.getAsync("scheduleshifts/shifts?" + qs, function (e) { return e; });
    var existing = existingRes.scheduleShifts || [];
    var seen = new Set(existing.map(function (s) { return [s.employeeId, String(s.date).slice(0, 10)].join("|"); }));
    var created = 0, skipped = 0, errors = [];
    for (var i = 0; i < shifts.length; i++) {
      var shift = shifts[i];
      var key = [shift.employeeId, shift.date].join("|");
      if (seen.has(key)) { skipped += 1; continue; }
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
          comment: shift.comment
        });
        seen.add(key);
        created += 1;
      } catch (err) {
        var detail = "";
        try { detail = err && err.message ? err.message : JSON.stringify(err); } catch (unused) { detail = String(err); }
        errors.push(shift.name + ": " + detail);
      }
    }
    var bits = ["Week " + pending.week + " · " + pending.site, created + " new unpublished drafts", skipped + " already in Caspeco"];
    if (pending.unmatched && pending.unmatched.length) bits.push("Not in Caspeco: " + pending.unmatched.join(", "));
    if (errors.length) bits.push("Errors: " + errors.slice(0, 3).join("; "));
    toast(bits.join(". "), errors.length === 0);
  } catch (err) {
    toast("Could not send. Are you logged in to Caspeco, and is Stora schema reachable? " + err, false);
  }
})();`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
