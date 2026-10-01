import { useMemo, useState, type FormEvent } from "react";
import {
  ETHNICITIES,
  GENDERS,
  RACES,
  adultOn,
  digitsOnly,
  EMPTY_ADDRESS,
  formatPhone,
  formatSsn,
  isCompleteAddress,
  isEmail,
  isPhone,
  type PostalAddress,
} from "@/lib/intake/model";
import { useOrigination } from "@/lib/intake/store";
import { AddressFields, Field, Select, TextInput } from "./fields";

export function CustomerForm() {
  const existing = useOrigination((s) => s.customer);
  const saveCustomer = useOrigination((s) => s.saveCustomer);

  const [firstName, setFirstName] = useState(existing?.firstName ?? "");
  const [lastName, setLastName] = useState(existing?.lastName ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [ssn, setSsn] = useState(existing ? `•••-••-${existing.ssnLast4}` : "");
  const [ssnDirty, setSsnDirty] = useState(!existing);
  const [dob, setDob] = useState(existing?.dob ?? "");
  const [gender, setGender] = useState(existing?.gender ?? "");
  const [race, setRace] = useState(existing?.race ?? "");
  const [ethnicity, setEthnicity] = useState(existing?.ethnicity ?? "");
  const [primary, setPrimary] = useState<PostalAddress>(existing?.primary ?? EMPTY_ADDRESS);
  const [mailing, setMailing] = useState<PostalAddress>(existing?.mailing ?? EMPTY_ADDRESS);
  const [sameMailing, setSameMailing] = useState(existing?.mailingSameAsPrimary ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () =>
      firstName.trim() &&
      lastName.trim() &&
      isEmail(email) &&
      isPhone(phone) &&
      (existing ? true : digitsOnly(ssn).length === 9),
    [firstName, lastName, email, phone, ssn, existing],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Required.";
    if (!lastName.trim()) next.lastName = "Required.";
    if (!isEmail(email)) next.email = "Enter a valid email.";
    if (!isPhone(phone)) next.phone = "Enter a 10-digit phone number.";
    const ssnDigits = digitsOnly(ssn);
    if (!existing && ssnDigits.length !== 9) next.ssn = "Enter a 9-digit SSN.";
    if (existing && ssnDirty && ssnDigits.length !== 9) next.ssn = "Enter a 9-digit SSN.";
    if (!dob) next.dob = "Required.";
    else if (!adultOn(dob)) next.dob = "Applicant must be 18 or older.";
    if (!gender) next.gender = "Required.";
    if (!race) next.race = "Required.";
    if (!ethnicity) next.ethnicity = "Required.";
    if (!isCompleteAddress(primary)) next.primary = "Complete the primary address.";
    if (!sameMailing && !isCompleteAddress(mailing)) next.mailing = "Complete the mailing address.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await saveCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone,
        ssn: existing && !ssnDirty ? "" : ssn,
        dob,
        gender,
        race,
        ethnicity,
        primary,
        mailing: sameMailing ? primary : mailing,
        mailingSameAsPrimary: sameMailing,
      });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save customer." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-white border border-line p-5 sm:p-8 grid gap-8" noValidate>
      <div className="rounded-md bg-paper border border-line px-4 py-3 text-sm">
        <span className="font-medium text-navy">Role — </span>
        Borrower. Default for the Customer on this file. Additional parties are assigned later.
      </div>
      {errors.form ? <p className="text-sm text-bad mb-0">{errors.form}</p> : null}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="First name" required error={errors.firstName}>
          <TextInput autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last name" required error={errors.lastName}>
          <TextInput autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email} hint="This becomes the login. Verified on the next screen.">
          <TextInput type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <TextInput
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            placeholder="(555) 555-0100"
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
        </Field>
        <Field label="SSN" required error={errors.ssn} hint="Nine digits. Stored as a token plus last four.">
          <TextInput
            inputMode="numeric"
            autoComplete="off"
            value={ssn}
            placeholder="•••-••-••••"
            onChange={(e) => {
              setSsnDirty(true);
              setSsn(formatSsn(e.target.value));
            }}
          />
        </Field>
        <Field label="Date of birth" required error={errors.dob}>
          <TextInput type="date" autoComplete="bday" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
      </div>

      <div>
        <h2 className="text-lg mb-1">Demographics</h2>
        <p className="text-ink-faint text-sm mb-4">Collected for SBA monitoring. Not an underwriting input.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Gender" required error={errors.gender}>
            <Select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select</option>
              {GENDERS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Race" required error={errors.race}>
            <Select value={race} onChange={(e) => setRace(e.target.value)}>
              <option value="">Select</option>
              {RACES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ethnicity" required error={errors.ethnicity}>
            <Select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)}>
              <option value="">Select</option>
              {ETHNICITIES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div>
        <h2 className="text-lg mb-1">Primary address</h2>
        {errors.primary ? <p className="mb-2 text-sm text-bad">{errors.primary}</p> : null}
        <AddressFields idPrefix="primary" value={primary} onChange={setPrimary} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg mb-0">Mailing address</h2>
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              className="size-4 accent-navy"
              checked={sameMailing}
              onChange={(e) => setSameMailing(e.target.checked)}
            />
            Same as primary
          </label>
        </div>
        {sameMailing ? (
          <p className="text-sm text-ink-soft rounded-md border border-line bg-paper px-3 py-3">
            Mailing will reference the primary address.
          </p>
        ) : (
          <>
            {errors.mailing ? <p className="mb-2 text-sm text-bad">{errors.mailing}</p> : null}
            <AddressFields idPrefix="mailing" value={mailing} onChange={setMailing} />
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="h-12 px-6 rounded-md bg-navy text-paper font-medium disabled:opacity-40 hover:bg-navy-2 transition-colors duration-150"
        >
          {busy ? "Saving…" : existing ? "Save customer and continue" : "Create customer and verify email"}
        </button>
      </div>
    </form>
  );
}
