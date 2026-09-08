import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (err) {
      setError(err.message ?? "Sign-in failed.");
      return;
    }
    window.location.href = "/";
  }

  if (isPending) {
    return (
      <main className="min-h-screen bg-paper grid place-items-center">
        <div className="h-10 w-40 rounded-md bg-paper-2 animate-pulse" />
      </main>
    );
  }
  if (user) return <Navigate to="/" />;

  return (
    <main className="min-h-screen bg-paper text-ink grid place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[0.7rem] tracking-[0.14em] uppercase text-accent mb-2">CygnusX-1</p>
        <h1 className="text-2xl mb-2">Sign in</h1>
        <p className="text-sm text-ink-soft mb-6">
          Returning applicants use the email and password from account setup.
        </p>
        {authEnabled ? (
          <form onSubmit={onSubmit} className="grid gap-3 mb-6">
            <label className="block text-sm font-medium text-navy">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-md bg-white border border-line"
              />
            </label>
            <label className="block text-sm font-medium text-navy">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-md bg-white border border-line"
              />
            </label>
            {error ? <p className="text-sm text-bad">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="h-11 rounded-md bg-navy text-paper font-medium disabled:opacity-40"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div className="relative my-2 text-center text-xs text-ink-faint">
              <span className="bg-paper px-2 relative z-10">or</span>
              <span className="absolute left-0 right-0 top-1/2 border-t border-line" />
            </div>
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="w-full h-11 rounded-md border border-line bg-white font-medium hover:border-accent"
              >
                Continue with {p.label}
              </button>
            ))}
          </form>
        ) : (
          <p className="text-sm text-ink-faint">Sign-in is disabled.</p>
        )}
        <Link to="/" className="text-sm text-accent">
          Back to application
        </Link>
      </div>
    </main>
  );
}
