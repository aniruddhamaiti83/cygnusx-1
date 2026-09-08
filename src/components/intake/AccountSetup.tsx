import { useState, type FormEvent } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { digitsOnly, isEmail } from "@/lib/intake/model";
import { useOrigination } from "@/lib/intake/store";
import { Field, TextInput } from "./fields";

function emailsMatch(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

function errorLooksLikeExistingUser(message: string) {
  const m = message.toLowerCase();
  return m.includes("already exists") || m.includes("already registered") || m.includes("user already");
}

export function AccountSetup() {
  const customer = useOrigination((s) => s.customer);
  const confirmEmailOnFile = useOrigination((s) => s.confirmEmail);
  const completeAccount = useOrigination((s) => s.completeAccount);
  const setStep = useOrigination((s) => s.setStep);
  const { user, isPending } = useCurrentUserState();

  const [confirmEmail, setConfirmEmail] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const filedEmail = customer?.email ?? "";
  const filedPhone = customer?.phone ?? "";
  const filedLast4 = digitsOnly(filedPhone).slice(-4);
  const phase: "verify" | "setup" = customer?.emailConfirmed ? "setup" : "verify";
  const sessionIsApplicant =
    Boolean(user) && !user?.isDevFallback && emailsMatch(user?.primaryEmail, filedEmail);

  async function submitVerify(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isEmail(confirmEmail)) next.confirmEmail = "Enter a valid email.";
    else if (!emailsMatch(confirmEmail, filedEmail)) {
      next.confirmEmail = "Must match the email on the Customer record.";
    }
    if (digitsOnly(phoneLast4).length !== 4) next.phoneLast4 = "Enter the last four digits.";
    else if (digitsOnly(phoneLast4) !== filedLast4) {
      next.phoneLast4 = "Does not match the phone on file.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await confirmEmailOnFile(confirmEmail.trim().toLowerCase(), digitsOnly(phoneLast4));
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not verify email." });
    } finally {
      setBusy(false);
    }
  }

  async function submitSetup(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const name = `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim();
    if (!sessionIsApplicant) {
      if (password.length < 8) next.password = "At least 8 characters.";
      if (mode === "signup" && password !== confirmPassword) next.confirmPassword = "Passwords do not match.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await completeAccount(
        sessionIsApplicant && password.length < 8 ? `${filedLast4}Cx1!pass` : password,
        name,
      );
      if (authEnabled && password.length >= 8) {
        if (mode === "signup") {
          const { error } = await authClient.signUp.email({ email: filedEmail, password, name });
          if (error && errorLooksLikeExistingUser(error.message ?? "")) {
            await authClient.signIn.email({ email: filedEmail, password });
          }
        } else {
          await authClient.signIn.email({ email: filedEmail, password });
        }
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not create the account." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg bg-white border border-line p-5 sm:p-8 grid gap-6">
      <div className="rounded-md bg-paper border border-line px-4 py-3 text-sm">
        <p className="mb-1">
          <span className="font-medium text-navy">Email on file — </span>
          {filedEmail}
        </p>
        <p className="mb-0 text-ink-soft">
          Phone ({digitsOnly(filedPhone).slice(0, 3)}) •••-{filedLast4 || "••••"}. Confirm
          both, then create the borrower login. No emailed one-time codes.
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-2">
        <li className={`rounded-md border px-3 py-2.5 text-sm ${phase === "verify" ? "border-navy bg-navy text-paper" : "border-line bg-good-wash text-good"}`}>
          <span className="font-mono text-[0.65rem] opacity-70 mr-1.5">1</span>
          {phase === "setup" ? "Email verified" : "Verify email"}
        </li>
        <li className={`rounded-md border px-3 py-2.5 text-sm ${phase === "setup" ? "border-navy bg-navy text-paper" : "border-line bg-paper text-ink-faint"}`}>
          <span className="font-mono text-[0.65rem] opacity-70 mr-1.5">2</span>
          Create login
        </li>
      </ol>

      {phase === "setup" && isPending ? (
        <div className="h-40 rounded-md bg-paper animate-pulse" />
      ) : phase === "verify" ? (
        <form onSubmit={submitVerify} className="grid gap-5" noValidate>
          <Field label="Confirm email" required error={errors.confirmEmail} hint="Re-type the address from the Customer record.">
            <TextInput type="email" autoComplete="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
          </Field>
          <Field label="Last four of phone" required error={errors.phoneLast4} hint="The last four digits of the phone on the Customer record.">
            <TextInput inputMode="numeric" autoComplete="off" maxLength={4} value={phoneLast4} onChange={(e) => setPhoneLast4(digitsOnly(e.target.value).slice(0, 4))} />
          </Field>
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={() => setStep("customer")} className="h-12 px-5 rounded-md border border-line bg-white font-medium hover:border-accent">
              Back to customer
            </button>
            <button type="submit" className="h-12 px-6 rounded-md bg-navy text-paper font-medium hover:bg-navy-2">
              Verify email
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submitSetup} className="grid gap-5" noValidate>
          {sessionIsApplicant && !isPending ? (
            <p className="text-sm text-ink-soft rounded-md border border-line px-4 py-3 mb-0">
              Signed in as {user?.primaryEmail}. That matches this Customer. Continue to attach the file to your login.
            </p>
          ) : (
            <>
              {user && !user.isDevFallback && !sessionIsApplicant ? (
                <p className="text-sm text-ink-soft rounded-md border border-line px-4 py-3 mb-0">
                  A staff session is open. Still create the borrower login for {filedEmail}.
                </p>
              ) : null}
              <div className="flex gap-2 text-sm">
                <button type="button" onClick={() => setMode("signup")} className={`h-11 px-3 rounded-md border ${mode === "signup" ? "bg-navy text-paper border-navy" : "border-line bg-white"}`}>
                  Create login
                </button>
                <button type="button" onClick={() => setMode("signin")} className={`h-11 px-3 rounded-md border ${mode === "signin" ? "bg-navy text-paper border-navy" : "border-line bg-white"}`}>
                  I already have a login
                </button>
              </div>
              <Field label="Password" required error={errors.password} hint="At least 8 characters.">
                <TextInput type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              {mode === "signup" ? (
                <Field label="Confirm password" required error={errors.confirmPassword}>
                  <TextInput type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </Field>
              ) : null}
            </>
          )}
          {errors.form ? <p className="text-sm text-bad mb-0">{errors.form}</p> : null}
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={() => setStep("customer")} className="h-12 px-5 rounded-md border border-line bg-white font-medium hover:border-accent">
              Back to customer
            </button>
            <button type="submit" disabled={busy || isPending} className="h-12 px-6 rounded-md bg-navy text-paper font-medium disabled:opacity-40 hover:bg-navy-2">
              {busy ? "Saving…" : sessionIsApplicant ? "Continue to business" : mode === "signup" ? "Create account and continue" : "Sign in and continue"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
