import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useOrigination, type Step } from "@/lib/intake/store";
import { AccountSetup } from "./AccountSetup";
import { BusinessForm } from "./BusinessForm";
import { Collateral } from "./Collateral";
import { ClosureStage, DocumentsStage, FinancingStage } from "./Closing";
import { CustomerForm } from "./CustomerForm";
import { FileRail } from "./FileRail";
import { LoanForm } from "./LoanForm";
import { PreApplication } from "./PreApplication";
import { Processing } from "./Processing";
import { Stepper } from "./Stepper";
import { SwarmDiagram } from "@/components/blueprint/SwarmDiagram";
import { Underwriter } from "./Underwriter";

const STAGE_COPY: Record<string, { kicker: string; title: string; lede: string }> = {
  intake: { kicker: "", title: "", lede: "" },
  preApplication: {
    kicker: "Pre-application · Qualify the customer",
    title: "Credit and fraud checks",
    lede: "Any one passing check — consumer credit, business credit, or fraud history — qualifies the customer to continue.",
  },
  processing: {
    kicker: "Processing · Processor",
    title: "Processing",
    lede: "Jordan Kim (processor). Mock SOS, SBA size, SAM.gov, and franchise checks — the report is stored on the SBA profile.",
  },
  collateral: {
    kicker: "Collateral · Processor",
    title: "Collateral",
    lede: "Typed items, lien position, location, insurance, coverage vs the facility. Mock UCC on the worker.",
  },
  underwriter: {
    kicker: "Underwriter · Credit decision",
    title: "Credit decision",
    lede: "Three agents read credit, collateral, and statements. Diana Okonkwo approves, or rejects with a reason.",
  },
  documents: {
    kicker: "Documents · Closer",
    title: "Closing package",
    lede: "Imaging ACK and review. A document is not filed without both.",
  },
  financing: {
    kicker: "Funding · Funding ops",
    title: "Funding",
    lede: "Human-authorized guaranty. Workers never invent a number.",
  },
  closure: {
    kicker: "Closure · Funding ops",
    title: "Ledger",
    lede: "Dual-control post seals the process.",
  },
};

export function ApplicationScreen() {
  const hydrated = useOrigination((s) => s.hydrated);
  const hydrate = useOrigination((s) => s.hydrate);
  const apiError = useOrigination((s) => s.apiError);
  const step = useOrigination((s) => s.step);
  const setStep = useOrigination((s) => s.setStep);
  const currentStage = useOrigination((s) => s.currentStage) ?? "intake";
  const customer = useOrigination((s) => s.customer);
  const business = useOrigination((s) => s.business);
  const processNumber = useOrigination((s) => s.processNumber);
  const resetFile = useOrigination((s) => s.resetFile);
  const llm = useOrigination((s) => s.llm);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const unlocked: Step[] = ["customer"];
  if (customer) unlocked.push("account");
  if (customer?.emailVerified) unlocked.push("business");
  if (customer?.emailVerified && business) unlocked.push("loan");

  const titles: Record<Step, { kicker: string; title: string; lede: string }> = {
    customer: {
      kicker: "Intake · Relationship manager",
      title: "Customer",
      lede: "Elena Voss (RM) starts the file. Include email and phone. Role defaults to borrower. Next: verify email and create a login.",
    },
    account: {
      kicker: "Intake · Applicant login",
      title: "Verify email and set up account",
      lede: "Confirm the email and last four of the phone on the Customer record, then create the borrower login. Business intake stays locked until both are done.",
    },
    business: {
      kicker: "Intake · Relationship manager",
      title: customer ? `Business · ${customer.firstName} ${customer.lastName}` : "Business",
      lede: "Create or edit the operating company. Loan amount and purpose sit at the bottom, then open Loan details.",
    },
    loan: {
      kicker: processNumber ? `${processNumber} · Intake` : "Intake · Loan",
      title: "Loan details",
      lede: "Borrower is the Customer (Account lookup). Switch it to the Business if that entity is the borrower of record. Save, then the RM moves the file to Pre-application.",
    },
  };

  const copy = currentStage === "intake" ? titles[step] : STAGE_COPY[currentStage];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader current="application" />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-8 items-start">
          <main className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <p className="font-mono text-xs tracking-[0.14em] uppercase text-accent mb-3">{copy.kicker}</p>
                <h1 className="text-3xl sm:text-[2.15rem] leading-tight mb-2">{copy.title}</h1>
                <p className="text-ink-soft max-w-prose mb-0">{copy.lede}</p>
                {llm ? (
                  <p className="text-xs font-mono text-ink-faint mt-2 mb-0">LLM · {llm.label}</p>
                ) : null}
              </div>
              {customer ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Start a new file? This clears the current process id from this browser.")) resetFile();
                  }}
                  className="h-10 px-3 rounded-md border border-line bg-white text-sm hover:border-accent"
                >
                  New file
                </button>
              ) : null}
            </div>

            <SwarmDiagram />

            {!hydrated ? (
              <p className="text-ink-soft">Loading file…</p>
            ) : apiError ? (
              <div className="rounded-lg border border-bad bg-bad-wash text-bad p-5 sm:p-6">
                <p className="font-medium mb-2">Origination API is not running</p>
                <p className="text-sm mb-3">
                  Saving a Customer needs FastAPI on port 8000. Leave this page open and start the
                  API in another terminal from the repo root, then refresh.
                </p>
                <pre className="text-xs font-mono bg-white/80 text-ink rounded-md px-3 py-2 overflow-x-auto mb-3">
                  {`python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
npm run api`}
                </pre>
                <p className="text-sm mb-0">
                  Windows: <span className="font-mono">py -3 -m venv backend\\.venv</span> then{" "}
                  <span className="font-mono">backend\\.venv\\Scripts\\pip install -r backend\\requirements.txt</span>{" "}
                  and <span className="font-mono">npm run api</span>. Or{" "}
                  <span className="font-mono">docker compose up --build</span>.
                </p>
                <p className="text-sm mt-3 mb-0 opacity-80">{apiError}</p>
              </div>
            ) : currentStage === "preApplication" ? (
              <PreApplication />
            ) : currentStage === "processing" ? (
              <Processing />
            ) : currentStage === "collateral" ? (
              <Collateral />
            ) : currentStage === "underwriter" ? (
              <Underwriter />
            ) : currentStage === "documents" ? (
              <DocumentsStage />
            ) : currentStage === "financing" ? (
              <FinancingStage />
            ) : currentStage === "closure" ? (
              <ClosureStage />
            ) : (
              <>
                <Stepper current={step} unlocked={unlocked} onSelect={setStep} />
                {step === "customer" ? <CustomerForm /> : null}
                {step === "account" && customer ? <AccountSetup /> : null}
                {step === "business" && customer?.emailVerified ? <BusinessForm /> : null}
                {step === "loan" && customer?.emailVerified && business ? <LoanForm /> : null}
              </>
            )}
          </main>
          <FileRail />
        </div>
      </div>
    </div>
  );
}
