"use client";

import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState(initialError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = browserSupabase();
    if (!sb) {
      setError("Supabase is not configured. The app is running in demo mode, so there is nothing to sign in to.");
      return;
    }
    setState("sending");
    setError(null);
    const redirect = new URL("/auth/confirm", window.location.origin);
    redirect.searchParams.set("next", next);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      // Travellers are created by the seed script; nobody else can sign up.
      options: { shouldCreateUser: false, emailRedirectTo: redirect.toString() },
    });
    if (error) {
      setState("idle");
      setError(
        /signups? not allowed|not found|otp_disabled/i.test(error.message)
          ? "That email isn't on the trip list. Check the spelling or ask the planner."
          : error.message,
      );
    } else setState("sent");
  }

  if (state === "sent")
    return (
      <p role="status" className="card p-4">
        Check <b>{email}</b> for a sign-in link. You can close this tab.
      </p>
    );

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </label>
      <button className="btn btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send me a link"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
