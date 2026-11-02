#!/usr/bin/env python3
"""Local Stora schema app. Other managers can run the same file on their Mac."""

from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PENDING = ROOT / "pending-send.json"
SALES_SETTINGS = ROOT / "sales-settings.json"
STAFF_RATES = ROOT / "staff-rates.json"
PORT = 8777


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/pending":
            body = PENDING.read_text(encoding="utf-8") if PENDING.exists() else "{}"
            self._json(200, body)
            return
        if path == "/api/sales-settings":
            body = SALES_SETTINGS.read_text(encoding="utf-8") if SALES_SETTINGS.exists() else '{"yearlyTargetPct":10}'
            self._json(200, body)
            return
        if path == "/api/staff-rates":
            body = STAFF_RATES.read_text(encoding="utf-8") if STAFF_RATES.exists() else '{"onCostPct":31.42,"hourly":{}}'
            self._json(200, body)
            return
        if self.path.split("?", 1)[0] in ("/", "/index.html"):
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        payload = json.loads(raw.decode("utf-8"))
        if path == "/api/pending":
            PENDING.write_bytes(raw)
            self._json(200, json.dumps({"ok": True, "bytes": length}))
            return
        if path == "/api/sales-settings":
            SALES_SETTINGS.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            self._json(200, json.dumps({"ok": True}))
            return
        if path == "/api/staff-rates":
            STAFF_RATES.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            self._json(200, json.dumps({"ok": True}))
            return
        self.send_error(404)

    def _json(self, status: int, body: str):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        print(f"{self.address_string()} {args[0]}")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Stora schema: http://127.0.0.1:{PORT}/")
    print("Keep this window open. Other managers can run: python3 web/server.py")
    server.serve_forever()
