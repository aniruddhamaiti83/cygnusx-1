import { useMemo, useState } from "react";
import {
  BUSINESS_PRODUCTS,
  BUSINESS_SOURCES,
  CONSUMER_PRODUCTS,
  CONSUMER_SOURCES,
} from "@/lib/intake/bureaus";
import { staffById } from "@/lib/intake/stages";
import { useOrigination, type CreditPull, type ScreenCheck } from "@/lib/intake/store";
import { Field, Select } from "./fields";

function isCreditPull(pull: CreditPull | ScreenCheck): pull is CreditPull {
  return "productCode" in pull && "score" in pull;
}

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function asDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase opacity-70 mb-0.5">{k}</p>
      <p className="text-sm mb-0 font-medium tabular-nums">{v}</p>
    </div>
  );
}

function Result({
  pull,
  scoreLabel,
}: {
  pull: CreditPull | ScreenCheck | null;
  scoreLabel?: string;
}) {
  if (!pull) {
    return (
      <p className="text-sm text-ink-faint mb-4">
        Not run. Optional — any one passing check qualifies the customer to continue.
      </p>
    );
  }
  const credit = isCreditPull(pull) ? pull : null;
  return (
    <div
      className={`rounded-md px-4 py-3 text-sm mb-4 ${
        pull.outcome === "pass" ? "bg-good-wash text-good" : "bg-bad-wash text-bad"
      }`}
    >
      <p className="font-medium mb-1">
        {pull.outcome === "pass" ? "Pass" : "Fail"}
        {credit ? ` · ${credit.scoreType || scoreLabel || "Score"} ${credit.score}` : ""}
      </p>
      <p className="mb-0">{pull.summary}</p>
      {credit ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Fact k="Type" v={credit.scoreType || scoreLabel || credit.productCode || "—"} />
          <Fact k="Score" v={credit.score != null ? String(credit.score) : "—"} />
          <Fact k="Last checked" v={asDate(credit.lastCheckedAt || credit.ranAt)} />
          <Fact k="Years since first credit" v={credit.yearsSinceFirstCredit != null ? String(credit.yearsSinceFirstCredit) : "—"} />
          <Fact k="Outstanding" v={money(credit.outstandingAmount)} />
          <Fact k="Utilization" v={credit.utilizationPct != null ? `${credit.utilizationPct}%` : "—"} />
          <Fact k="Open tradelines" v={credit.openTradelines != null ? String(credit.openTradelines) : "—"} />
          <Fact k="Past due" v={money(credit.pastDueAmount)} />
        </div>
      ) : null}
      {"artefactId" in pull && pull.artefactId ? (
        <p className="mt-2 mb-0 font-mono text-xs opacity-80">artefactId {pull.artefactId.slice(0, 12)}…</p>
      ) : null}
      <p className="mt-1 mb-0 text-xs opacity-80">
        {pull.actor} · {new Date(pull.ranAt).toLocaleString()}
        {"provider" in pull && pull.provider ? ` · ${pull.provider}` : ""}
      </p>
    </div>
  );
}

export function PreApplication() {
  const customer = useOrigination((s) => s.customer);
  const business = useOrigination((s) => s.business);
  const consumerPull = useOrigination((s) => s.consumerPull);
  const businessPull = useOrigination((s) => s.businessPull);
  const fraudCheck = useOrigination((s) => s.fraudCheck);
  const runConsumer = useOrigination((s) => s.runConsumer);
  const runCommercial = useOrigination((s) => s.runCommercial);
  const runFraud = useOrigination((s) => s.runFraud);
  const advanceStage = useOrigination((s) => s.advanceStage);
  const llm = useOrigination((s) => s.llm);

  const [consumerSource, setConsumerSource] = useState(consumerPull?.source ?? "equifax");
  const [consumerProduct, setConsumerProduct] = useState(consumerPull?.productCode ?? "fico9");
  const [businessSource, setBusinessSource] = useState(businessPull?.source ?? "experianBusiness");
  const [businessProduct, setBusinessProduct] = useState(businessPull?.productCode ?? "intelliscorePlus");
  const [busy, setBusy] = useState<"consumer" | "business" | "fraud" | "advance" | null>(null);
  const [error, setError] = useState("");

  const creditOfficer = staffById("cr-marcus");
  const fraudAnalyst = staffById("fr-priya");
  const name = customer ? `${customer.firstName} ${customer.lastName}` : "Customer";
  const company = business?.legalName ?? "Business";

  const bizProducts = useMemo(
    () => BUSINESS_PRODUCTS[businessSource] ?? BUSINESS_PRODUCTS.experianBusiness,
    [businessSource],
  );

  async function wrap(key: typeof busy, fn: () => Promise<void>) {
    setError("");
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent failed.");
    } finally {
      setBusy(null);
    }
  }

  const qualifiedOn = [
    consumerPull?.outcome === "pass" ? "consumer credit" : null,
    businessPull?.outcome === "pass" ? "business credit" : null,
    fraudCheck?.outcome === "pass" ? "fraud history" : null,
  ].filter(Boolean) as string[];
  const ready = qualifiedOn.length > 0;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Pre-application qualifies the customer to continue the loan. Any one passing check —
        consumer credit, business credit, or fraud history — is enough to move to Processing.
        The other checks stay optional. Bureau pulls store type, score, last checked, years
        since first credit, and outstanding.
        {llm ? ` Model: ${llm.label}.` : ""}
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <div>
          <h2 className="text-lg mb-1">Consumer credit</h2>
          <p className="text-sm text-ink-soft mb-0">
            {name} · Account · last four •••-••-{customer?.ssnLast4 ?? "••••"} · Credit officer{" "}
            {creditOfficer.name}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Bureau">
            <Select value={consumerSource} onChange={(e) => setConsumerSource(e.target.value)} disabled={Boolean(consumerPull)}>
              {CONSUMER_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Product">
            <Select value={consumerProduct} onChange={(e) => setConsumerProduct(e.target.value)} disabled={Boolean(consumerPull)}>
              {CONSUMER_PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Result pull={consumerPull} scoreLabel="FICO" />
        <button
          type="button"
          disabled={busy !== null || Boolean(consumerPull)}
          onClick={() => wrap("consumer", () => runConsumer(consumerSource, consumerProduct))}
          className="justify-self-start h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
        >
          {busy === "consumer" ? "Pulling…" : consumerPull ? "Artefact stored" : "Pull consumer credit"}
        </button>
      </article>

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <div>
          <h2 className="text-lg mb-1">Business credit</h2>
          <p className="text-sm text-ink-soft mb-0">
            {company} · EIN last four {business?.taxIdLast4 ?? "••••"} · not a consumer report
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Bureau">
            <Select
              value={businessSource}
              disabled={Boolean(businessPull)}
              onChange={(e) => {
                const next = e.target.value;
                setBusinessSource(next);
                setBusinessProduct(BUSINESS_PRODUCTS[next]?.[0]?.id ?? "");
              }}
            >
              {BUSINESS_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Product">
            <Select
              value={businessProduct}
              disabled={Boolean(businessPull)}
              onChange={(e) => setBusinessProduct(e.target.value)}
            >
              {bizProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Result pull={businessPull} scoreLabel={businessSource === "dnb" ? "PAYDEX" : "Intelliscore"} />
        <button
          type="button"
          disabled={busy !== null || Boolean(businessPull)}
          onClick={() => wrap("business", () => runCommercial(businessSource, businessProduct))}
          className="justify-self-start h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
        >
          {busy === "business" ? "Pulling…" : businessPull ? "Artefact stored" : "Pull business credit"}
        </button>
      </article>

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
        <h2 className="text-lg mb-1">Fraud history</h2>
        <p className="text-sm text-ink-soft mb-4">
          {name} and {company} · OFAC / SDN / internal · {fraudAnalyst.name}
        </p>
        <Result pull={fraudCheck} />
        <button
          type="button"
          disabled={busy !== null || Boolean(fraudCheck)}
          onClick={() => wrap("fraud", () => runFraud())}
          className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
        >
          {busy === "fraud" ? "Screening…" : fraudCheck ? "Screen stored" : "Run fraud screen"}
        </button>
      </article>

      {ready ? (
        <div className="rounded-lg bg-white border border-line p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-good mb-0">
            Qualified on {qualifiedOn.join(" · ")}. Processor can open the file.
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => wrap("advance", () => advanceStage())}
            className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium hover:bg-navy-2 disabled:opacity-40"
          >
            {busy === "advance" ? "Moving…" : "Move to Processing"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
