import { useMemo, useState, type FormEvent } from "react";
import {
  AFS_PURPOSE_CODES,
  INDEX_RATES,
  LOAN_PURPOSES,
  LOAN_STATUSES,
  PRIN_FREQUENCIES,
  PRODUCTS,
  RATE_BASES,
} from "@/lib/intake/catalog";
import { formatMoneyInput, newId } from "@/lib/intake/model";
import {
  businessRef,
  customerRef,
  useOrigination,
  type Loan,
} from "@/lib/intake/store";
import { Field, Select, TextInput } from "./fields";

export function LoanForm() {
  const processId = useOrigination((s) => s.processId);
  const processNumber = useOrigination((s) => s.processNumber);
  const customer = useOrigination((s) => s.customer);
  const business = useOrigination((s) => s.business);
  const existing = useOrigination((s) => s.loan);
  const collaterals = useOrigination((s) => s.collaterals);
  const saveLoan = useOrigination((s) => s.saveLoan);
  const setStep = useOrigination((s) => s.setStep);

  const defaultBorrower = customer ? customerRef(customer.customerId) : "";
  const [form, setForm] = useState<Loan>(() => ({
    loanId: existing?.loanId ?? newId(),
    processId,
    borrowerRef: existing?.borrowerRef || defaultBorrower,
    productId: existing?.productId ?? "",
    interestRate: existing?.interestRate ?? "",
    loanAmount: existing?.loanAmount ?? business?.loanAmount ?? "",
    basis: existing?.basis ?? "actual360",
    indexRate: existing?.indexRate ?? "prime",
    interestOnlyPayment: existing?.interestOnlyPayment ?? "",
    spread: existing?.spread ?? "",
    status: existing?.status ?? "processing",
    closingDate: existing?.closingDate ?? "",
    balloon: existing?.balloon ?? false,
    afsPurposeCode: existing?.afsPurposeCode ?? "",
    firstPrinPaymentDate: existing?.firstPrinPaymentDate ?? "",
    prinFrequency: existing?.prinFrequency ?? "monthly",
    primaryCollateralId: existing?.primaryCollateralId ?? "",
    primaryClientId: existing?.primaryClientId || customer?.customerId || "",
    primaryBorrowerRef: existing?.primaryBorrowerRef || defaultBorrower,
    primaryBusinessId: existing?.primaryBusinessId || business?.businessId || "",
    guarantorId: existing?.guarantorId ?? "",
    coborrowerId: existing?.coborrowerId ?? "",
    purposeId: existing?.purposeId || business?.loanPurpose || "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function patch<K extends keyof Loan>(key: K, value: Loan[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const partyOptions = useMemo(() => {
    const rows: { value: string; label: string }[] = [];
    if (customer) {
      rows.push({
        value: customerRef(customer.customerId),
        label: `Account · ${customer.firstName} ${customer.lastName}`,
      });
    }
    if (business) {
      rows.push({
        value: businessRef(business.businessId),
        label: `Business · ${business.legalName}`,
      });
    }
    return rows;
  }, [customer, business]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.borrowerRef) next.borrowerRef = "Select the borrower.";
    if (!form.productId) next.productId = "Select a product.";
    if (!form.loanAmount || Number(form.loanAmount) <= 0) next.loanAmount = "Enter the loan amount.";
    if (!form.interestRate) next.interestRate = "Required.";
    if (!form.status) next.status = "Required.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await saveLoan({ ...form, processId });
      setSaved(true);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save loan." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-white border border-line p-5 sm:p-8 grid gap-8" noValidate>
      <div className="rounded-md bg-paper border border-line px-4 py-3 text-sm">
        <span className="font-medium text-navy">{processNumber} — </span>
        Borrower defaults to the Customer (Account). Change it to the Business if the
        operating company is the borrower of record. Save this page so the RM can move
        the file to Pre-application.
      </div>

      {saved ? (
        <p className="rounded-md bg-good-wash text-good px-4 py-3 text-sm mb-0">
          Loan details saved on this process. File remains in Processing until submitted.
        </p>
      ) : null}
      {errors.form ? <p className="text-sm text-bad mb-0">{errors.form}</p> : null}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Borrower"
          required
          error={errors.borrowerRef}
          hint="Lookup to Account. May be switched to the Business record."
        >
          <Select value={form.borrowerRef} onChange={(e) => patch("borrowerRef", e.target.value)}>
            <option value="">Select</option>
            {partyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Product" required error={errors.productId} hint="Lookup to Product (Loan).">
          <Select
            value={form.productId}
            onChange={(e) => patch("productId", e.target.value as Loan["productId"])}
          >
            <option value="">Select</option>
            {PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Loan amount" required error={errors.loanAmount}>
          <TextInput
            inputMode="decimal"
            value={form.loanAmount}
            onChange={(e) => patch("loanAmount", formatMoneyInput(e.target.value))}
          />
        </Field>
        <Field label="Interest rate (%)" required error={errors.interestRate}>
          <TextInput
            inputMode="decimal"
            value={form.interestRate}
            onChange={(e) => patch("interestRate", e.target.value)}
          />
        </Field>
        <Field label="Basis">
          <Select value={form.basis} onChange={(e) => patch("basis", e.target.value)}>
            {RATE_BASES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Index rate">
          <Select value={form.indexRate} onChange={(e) => patch("indexRate", e.target.value)}>
            {INDEX_RATES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Spread (%)">
          <TextInput
            inputMode="decimal"
            value={form.spread}
            onChange={(e) => patch("spread", e.target.value)}
          />
        </Field>
        <Field label="Interest only payment" hint="Amount of the IO payment. Leave blank if amortizing.">
          <TextInput
            inputMode="decimal"
            value={form.interestOnlyPayment}
            onChange={(e) => patch("interestOnlyPayment", formatMoneyInput(e.target.value))}
          />
        </Field>
        <Field label="Status" required error={errors.status}>
          <Select
            value={form.status}
            onChange={(e) => patch("status", e.target.value as Loan["status"])}
          >
            {LOAN_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Closing date">
          <TextInput
            type="date"
            value={form.closingDate}
            onChange={(e) => patch("closingDate", e.target.value)}
          />
        </Field>
        <Field label="Balloon">
          <Select
            value={form.balloon ? "yes" : "no"}
            onChange={(e) => patch("balloon", e.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Field>
        <Field label="AFS purpose code">
          <Select value={form.afsPurposeCode} onChange={(e) => patch("afsPurposeCode", e.target.value)}>
            <option value="">Select</option>
            {AFS_PURPOSE_CODES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="First prin payment date">
          <TextInput
            type="date"
            value={form.firstPrinPaymentDate}
            onChange={(e) => patch("firstPrinPaymentDate", e.target.value)}
          />
        </Field>
        <Field label="Prin frequency">
          <Select value={form.prinFrequency} onChange={(e) => patch("prinFrequency", e.target.value)}>
            {PRIN_FREQUENCIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Loan purpose">
          <Select
            value={form.purposeId}
            onChange={(e) => patch("purposeId", e.target.value as Loan["purposeId"])}
          >
            <option value="">Select</option>
            {LOAN_PURPOSES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <h2 className="text-lg mb-1">Lookups</h2>
        <p className="text-ink-faint text-sm mb-4">
          Foreign keys to Account, Business, and Collateral. Collateral is empty until a
          pledged item is created.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primary collateral" hint="Lookup to CollateralItem.">
            <Select
              value={form.primaryCollateralId}
              onChange={(e) => patch("primaryCollateralId", e.target.value)}
            >
              <option value="">None on file</option>
              {collaterals.map((c) => (
                <option key={c.itemId} value={c.itemId}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Primary client" hint="Lookup to Account.">
            <Select value={form.primaryClientId} onChange={(e) => patch("primaryClientId", e.target.value)}>
              <option value="">Select</option>
              {customer ? (
                <option value={customer.customerId}>
                  {customer.firstName} {customer.lastName}
                </option>
              ) : null}
            </Select>
          </Field>
          <Field label="Primary borrower" hint="Lookup — Account or Business.">
            <Select
              value={form.primaryBorrowerRef}
              onChange={(e) => patch("primaryBorrowerRef", e.target.value)}
            >
              <option value="">Select</option>
              {partyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Primary business" hint="Lookup to Business.">
            <Select
              value={form.primaryBusinessId}
              onChange={(e) => patch("primaryBusinessId", e.target.value)}
            >
              <option value="">Select</option>
              {business ? <option value={business.businessId}>{business.legalName}</option> : null}
            </Select>
          </Field>
          <Field label="Guarantor" hint="Lookup to Account.">
            <Select value={form.guarantorId} onChange={(e) => patch("guarantorId", e.target.value)}>
              <option value="">None</option>
              {customer ? (
                <option value={customer.customerId}>
                  {customer.firstName} {customer.lastName}
                </option>
              ) : null}
            </Select>
          </Field>
          <Field label="Co-borrower" hint="Lookup to Account.">
            <Select value={form.coborrowerId} onChange={(e) => patch("coborrowerId", e.target.value)}>
              <option value="">None</option>
              {customer ? (
                <option value={customer.customerId}>
                  {customer.firstName} {customer.lastName}
                </option>
              ) : null}
            </Select>
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep("business")}
          className="h-12 px-5 rounded-md border border-line bg-white font-medium hover:border-accent"
        >
          Back to business
        </button>
        <button
          type="submit"
          disabled={busy}
          className="h-12 px-6 rounded-md bg-navy text-paper font-medium hover:bg-navy-2 transition-colors duration-150 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save loan details"}
        </button>
      </div>
    </form>
  );
}
