import { PROCESS_STAGES, deskLabel, staffById } from "@/lib/intake/stages";
import { useOrigination } from "@/lib/intake/store";

export function FileRail() {
  const currentStage = useOrigination((s) => s.currentStage) ?? "intake";
  const team = useOrigination((s) => s.team);
  const customer = useOrigination((s) => s.customer);
  const business = useOrigination((s) => s.business);
  const loanSaved = useOrigination((s) => s.loanSaved);
  const processNumber = useOrigination((s) => s.processNumber);
  const consumerPull = useOrigination((s) => s.consumerPull);
  const businessPull = useOrigination((s) => s.businessPull);
  const fraudCheck = useOrigination((s) => s.fraudCheck);
  const kybReport = useOrigination((s) => s.kybReport);
  const sbaProfile = useOrigination((s) => s.sbaProfile);
  const collaterals = useOrigination((s) => s.collaterals);
  const pledges = useOrigination((s) => s.pledges);
  const scorecard = useOrigination((s) => s.scorecard);
  const documents = useOrigination((s) => s.documents);
  const guaranty = useOrigination((s) => s.guaranty);
  const advance = useOrigination((s) => s.advanceStage);
  const llm = useOrigination((s) => s.llm);

  const idx = PROCESS_STAGES.findIndex((s) => s.id === currentStage);
  const intakeReady = Boolean(customer && business && loanSaved && currentStage === "intake");
  const preAppReady = Boolean(
    currentStage === "preApplication" &&
      consumerPull?.outcome === "pass" &&
      businessPull?.outcome === "pass" &&
      fraudCheck?.outcome === "pass",
  );
  const processingReady = Boolean(currentStage === "processing" && kybReport && sbaProfile);
  const collateralReady = Boolean(currentStage === "collateral" && collaterals.length && pledges.length);
  const docsReady = Boolean(
    currentStage === "documents" && documents.length && documents.every((d) => d.imagedAck && d.reviewed),
  );
  const finReady = Boolean(currentStage === "financing" && guaranty?.status === "accepted");

  const cta =
    currentStage === "intake"
      ? { ready: intakeReady, label: "RM: move to Pre-application", hint: "Complete Customer, email verification, Business, and save Loan details." }
      : currentStage === "preApplication"
        ? { ready: preAppReady, label: "Move to Processing", hint: "Consumer credit, business credit, and fraud must pass." }
        : currentStage === "processing"
          ? { ready: processingReady, label: "Move to Collateral", hint: "KYB and SBA profile are required." }
          : currentStage === "collateral"
            ? { ready: collateralReady, label: "Move to Underwriter", hint: "Add at least one pledged item." }
            : currentStage === "underwriter"
              ? { ready: false, label: "", hint: scorecard ? "Human of record decides on the page." : "Run the policy pack first." }
              : currentStage === "documents"
                ? { ready: docsReady, label: "Move to Financing", hint: "ACK and review every required document." }
                : currentStage === "financing"
                  ? { ready: finReady, label: "Move to Closure", hint: "Authorize E-Tran first." }
                  : null;

  return (
    <aside className="lg:sticky lg:top-6 space-y-4 min-w-0">
      <section className="rounded-lg bg-white border border-line p-4">
        <p className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-accent mb-3">Stages</p>
        {processNumber ? (
          <p className="text-xs text-ink-faint mb-3 font-mono">{processNumber}</p>
        ) : (
          <p className="text-xs text-ink-faint mb-3">File opens when the RM creates the Customer.</p>
        )}
        <ol className="grid gap-0.5">
          {PROCESS_STAGES.map((s, i) => {
            const on = s.id === currentStage;
            const done = i < idx;
            return (
              <li
                key={s.id}
                className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm ${on ? "bg-navy text-paper" : ""}`}
              >
                <span
                  className={`font-mono text-[0.65rem] w-5 shrink-0 ${
                    on ? "text-accent-soft" : done ? "text-good" : "text-ink-faint"
                  }`}
                >
                  {done ? "✓" : s.n}
                </span>
                <span className={on ? "font-medium" : done ? "text-ink" : "text-ink-faint"}>{s.label}</span>
              </li>
            );
          })}
        </ol>
        {cta && cta.label ? (
          <button
            type="button"
            disabled={!cta.ready}
            onClick={() => void advance()}
            className="mt-4 w-full h-11 px-3 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2 transition-colors duration-150"
          >
            {cta.label}
          </button>
        ) : null}
        {cta && !cta.ready ? <p className="mt-2 text-xs text-ink-faint">{cta.hint}</p> : null}
      </section>

      {llm ? (
        <section className="rounded-lg bg-white border border-line p-4">
          <p className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-accent mb-2">LLM</p>
          <p className="text-sm mb-0">{llm.label}</p>
          <p className="text-xs text-ink-faint mt-1 mb-0">
            {llm.configured ? "LangChain workers call this model." : "Heuristic stand-in until a local model is configured."}
          </p>
        </section>
      ) : null}

      {customer ? (
        <section className="rounded-lg bg-white border border-line p-4">
          <p className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-accent mb-3">Applicant login</p>
          <p className="text-sm text-ink break-all mb-3">{customer.email}</p>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-baseline justify-between gap-2">
              <span className="text-ink-faint">Email</span>
              <span className={customer.emailConfirmed ? "text-good" : "text-warn"}>
                {customer.emailConfirmed ? "Verified" : "Pending"}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-2">
              <span className="text-ink-faint">Account</span>
              <span className={customer.emailVerified ? "text-good" : "text-warn"}>
                {customer.emailVerified ? "Created" : "Pending"}
              </span>
            </li>
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg bg-white border border-line p-4">
        <p className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-accent mb-3">Team</p>
        <ul className="grid gap-3">
          {(team?.length ? team : []).map((seat) => {
            const person = seat.staffId ? staffById(seat.staffId) : null;
            const onNow =
              (currentStage === "intake" && seat.desk === "rm") ||
              (currentStage === "preApplication" &&
                (seat.desk === "credit" || seat.desk === "fraud" || seat.desk === "rm")) ||
              ((currentStage === "processing" || currentStage === "collateral") &&
                (seat.desk === "processor" || seat.desk === "rm")) ||
              (currentStage === "underwriter" && (seat.desk === "underwriter" || seat.desk === "rm")) ||
              ((currentStage === "documents" || currentStage === "financing" || currentStage === "closure") &&
                (seat.desk === "closer" || seat.desk === "rm"));
            return (
              <li key={seat.desk} className="min-w-0">
                <p className="text-[0.72rem] text-ink-faint">{deskLabel(seat.desk)}</p>
                {person ? (
                  <p className={`text-sm leading-tight ${onNow ? "text-navy font-medium" : "text-ink"}`}>{person.name}</p>
                ) : (
                  <p className="text-sm text-ink-faint">Unassigned</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
