"use client";

import { useState } from "react";
import { login } from "@/lib/actions";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="field-row"
      style={{ display: "grid", gap: 12 }}
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const result = await login(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-navy" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
