import { useMemo, useState, type FormEvent } from "react";
import {
  BUSINESS_TYPES,
  digitsOnly,
  EMPTY_ADDRESS,
  formatEin,
  formatMoneyInput,
  isCompleteAddress,
  type PostalAddress,
} from "@/lib/intake/model";
import { LOAN_PURPOSES } from "@/lib/intake/catalog";
import { useOrigination } from "@/lib/intake/store";
import { AddressFields, Field, Select, TextInput } from "./fields";

export function BusinessForm() {
  const existing = useOrigination((s) => s.business);
  const saveBusiness = useOrigination((s) => s.saveBusiness);
  const setStep = useOrigination((s) => s.setStep);

  const [legalName, setLegalName] = useState(existing?.legalName ?? "");
  const [taxId, setTaxId] = useState(existing ? `••-•••${existing.taxIdLast4}` : "");
  const [taxDirty, setTaxDirty] = useState(!existing);
  const [businessType, setBusinessType] = useState(existing?.businessType ?? "");
  const [incorporatedOn, setIncorporatedOn] = useState(existing?.incorporatedOn ?? "");
  const [naicsCode, setNaicsCode] = useState(existing?.naicsCode ?? "");
  const [address, setAddress] = useState<PostalAddress>(existing?.address ?? EMPTY_ADDRESS);
  const [loanAmount, setLoanAmount] = useState(existing?.loanAmount ?? "");
  const [loanPurpose, setLoanPurpose] = useState(existing?.loanPurpose ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () => legalName.trim() && (existing ? true : digitsOnly(taxId).length === 9) && businessType,
    [legalName, taxId, businessType, existing],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!legalName.trim()) next.legalName = "Required.";
    const taxDigits = digitsOnly(taxId);
    if (!existing && taxDigits.length !== 9) next.taxId = "Enter a 9-digit EIN or SSN.";
    if (existing && taxDirty && taxDigits.length !== 9) next.taxId = "Enter a 9-digit EIN or SSN.";
    if (!businessType) next.businessType = "Required.";
    if (!incorporatedOn) next.incorporatedOn = "Required.";
    if (digitsOnly(naicsCode).length !== 6) next.naicsCode = "Enter a 6-digit NAICS code.";
    if (!isCompleteAddress(address)) next.address = "Complete the business address.";
    if (!loanAmount || Number(loanAmount) <= 0) next.loanAmount = "Enter the requested amount.";
    if (!loanPurpose) next.loanPurpose = "Required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await saveBusiness({
        legalName: legalName.trim(),
        taxId: existing && !taxDirty ? "" : taxId,
        businessType,
        incorporatedOn,
        naicsCode: digitsOnly(naicsCode).slice(0, 6),
        address,
        loanAmount,
        loanPurpose,
      });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save business." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-white border border-line p-5 sm:p-8 grid gap-8" noValidate>
      {errors.form ? <p className="text-sm text-bad mb-0">{errors.form}</p> : null}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Business name" required error={errors.legalName}>
          <TextInput value={legalName} autoComplete="organization" onChange={(e) => setLegalName(e.target.value)} />
        </Field>
        <Field label="EIN / SSN" required error={errors.taxId} hint="Nine digits. Tokenized at save.">
          <TextInput
            inputMode="numeric"
            autoComplete="off"
            value={taxId}
            placeholder="••-•••••••"
            onChange={(e) => {
              setTaxDirty(true);
              setTaxId(formatEin(e.target.value));
            }}
          />
        </Field>
        <Field label="Business type" required error={errors.businessType}>
          <Select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            <option value="">Select</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date incorporated" required error={errors.incorporatedOn}>
          <TextInput type="date" value={incorporatedOn} onChange={(e) => setIncorporatedOn(e.target.value)} />
        </Field>
        <Field label="NAICS code" required error={errors.naicsCode}>
          <TextInput inputMode="numeric" maxLength={6} value={naicsCode} onChange={(e) => setNaicsCode(digitsOnly(e.target.value).slice(0, 6))} />
        </Field>
      </div>

      <div>
        <h2 className="text-lg mb-1">Business address</h2>
        {errors.address ? <p className="mb-2 text-sm text-bad">{errors.address}</p> : null}
        <AddressFields idPrefix="biz" value={address} onChange={setAddress} />
      </div>

      <div className="border-t border-line pt-6 grid sm:grid-cols-2 gap-4">
        <h2 className="sm:col-span-2 text-lg mb-0">Requested facility</h2>
        <Field label="Loan amount" required error={errors.loanAmount}>
          <TextInput inputMode="decimal" value={loanAmount} placeholder="0.00" onChange={(e) => setLoanAmount(formatMoneyInput(e.target.value))} />
        </Field>
        <Field label="Loan purpose" required error={errors.loanPurpose}>
          <Select value={loanPurpose} onChange={(e) => setLoanPurpose(e.target.value as typeof loanPurpose)}>
            <option value="">Select</option>
            {LOAN_PURPOSES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" onClick={() => setStep("customer")} className="h-12 px-5 rounded-md border border-line bg-white font-medium hover:border-accent">
          Back to customer
        </button>
        <button type="submit" disabled={!canSubmit || busy} className="h-12 px-6 rounded-md bg-navy text-paper font-medium disabled:opacity-40 hover:bg-navy-2 transition-colors duration-150">
          {existing ? "Save business and open loan" : "Create business and open loan"}
        </button>
      </div>
    </form>
  );
}
