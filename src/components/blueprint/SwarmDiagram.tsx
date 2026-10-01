/** Mirrors backend/app/agents/origination_graph.py ARCHITECTURE. */

const STAGES: {
  n: string;
  name: string;
  human: string;
  agents: string[];
  gate: string;
}[] = [
  {
    n: "01",
    name: "Intake",
    human: "Elena Voss, relationship manager",
    agents: ["CIP / identity", "Facility keepers"],
    gate: "Email verified. Business and Loan saved. No model call.",
  },
  {
    n: "02",
    name: "Pre-application",
    human: "Marcus Hale, credit · Priya Shah, fraud",
    agents: ["Consumer credit", "Commercial credit", "Fraud"],
    gate: "Any one pass qualifies the customer.",
  },
  {
    n: "03",
    name: "Processing",
    human: "Jordan Kim, processor",
    agents: ["Processing pack"],
    gate: "KYB, SBA profile, and statement years stored.",
  },
  {
    n: "04",
    name: "Collateral",
    human: "Jordan Kim, processor",
    agents: ["Collateral"],
    gate: "At least one pledge: lease, machine, land, property, or insurance.",
  },
  {
    n: "05",
    name: "Credit decision",
    human: "Diana Okonkwo approves, or rejects with a reason",
    agents: ["Credit", "Collateral", "Statements", "Critic"],
    gate: "Releasable only at 97% confidence and under 3% hallucination. Approval moves the loan to Funding.",
  },
  {
    n: "06",
    name: "Documents",
    human: "Sam Ruiz, closer",
    agents: ["Documentation"],
    gate: "Every document imaged and reviewed.",
  },
  {
    n: "07",
    name: "Funding",
    human: "Sam Ruiz, funding ops",
    agents: ["Funding"],
    gate: "Human authorizes the guaranty. The agent does not invent the number.",
  },
  {
    n: "08",
    name: "Closure",
    human: "Sam Ruiz, funding ops",
    agents: ["Funding", "Evaluator"],
    gate: "Dual-control post seals the file.",
  },
];

export function SwarmDiagram() {
  return (
    <section className="rounded-lg border border-line bg-white p-4 sm:p-5 mb-6" aria-label="Agent architecture from intake through funding">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-lg mb-0">Agent architecture</h3>
        <p className="text-xs font-mono text-ink-faint mb-0">Supervisor from intake to funding</p>
      </div>
      <div className="rounded-md bg-navy text-paper px-3 py-3 mb-3">
        <p className="font-medium mb-0.5">Supervisor</p>
        <p className="text-sm text-accent-soft mb-0">
          Reads the stage on the file and dispatches only that stage’s agents. The credit decision is its own graph: Credit, then Collateral, then Statements, then the critic.
        </p>
      </div>
      <ol className="grid gap-2 mb-0 list-none p-0">
        {STAGES.map((stage) => (
          <li key={stage.n} className="grid sm:grid-cols-[6.5rem_minmax(0,1fr)] gap-2 sm:gap-4 border border-line rounded-md px-3 py-3">
            <div>
              <p className="font-mono text-xs text-accent mb-0.5">{stage.n}</p>
              <p className="font-medium mb-0">{stage.name}</p>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {stage.agents.map((agent, index) => (
                  <span key={agent} className="inline-flex items-center gap-1.5">
                    {index > 0 ? <span className="text-ink-faint text-sm" aria-hidden>→</span> : null}
                    <span className="rounded-md border border-line bg-paper px-2 py-1 text-sm">{agent}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-soft mt-2 mb-0">{stage.human}</p>
              <p className="text-xs text-ink-faint mt-1 mb-0">{stage.gate}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
