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
        Not run. Fail-closed — missing artefact is not a pass. Retry reuses the same artefact.
      </p>
    );
  }
  const score = "score" in pull ? pull.score : undefined;
  const artefact = "artefactId" in pull ? pull.artefactId : undefined;
  return (
    <div
      className={`rounded-md px-4 py-3 text-sm mb-4 ${
        pull.outcome === "pass" ? "bg-good-wash text-good" : "bg-bad-wash text-bad"
      }`}
    >
      <p className="font-medium mb-1">
        {pull.outcome === "pass" ? "Pass" : "Fail"}
        {score != null ? ` · ${scoreLabel ?? "Score"} ${score}` : ""}
      </p>
      <p className="mb-0">{pull.summary}</p>
      {artefact ? <p className="mt-2 mb-0 font-mono text-xs opacity-80">artefactId {artefact.slice(0, 12)}…</p> : null}
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

  const ready =
    consumerPull?.outcome === "pass" &&
    businessPull?.outcome === "pass" &&
    fraudCheck?.outcome === "pass";

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Split bureau pulls via the LangChain swarm. Consumer CRA is FCRA. Business credit is a
        commercial report. SBSS is not the SBA gate. Fail-closed.
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
            Consumer, business, and fraud gates passed. Processor can open the file.
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
