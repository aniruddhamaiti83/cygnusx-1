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
import { Underwriter } from "./Underwriter";

const STAGE_COPY: Record<string, { kicker: string; title: string; lede: string }> = {
  intake: { kicker: "", title: "", lede: "" },
  preApplication: {
    kicker: "Pre-application · Consumer & business credit",
    title: "Credit bureau pulls",
    lede: "Consumer CRA on the liable Account (FCRA). Commercial bureau on the Business. Fraud screen. Fail-closed.",
  },
  processing: {
    kicker: "Processing · Processor",
    title: "Processing",
    lede: "Jordan Kim (processor). KYB and SBA size/eligibility on the Business.",
  },
  collateral: {
    kicker: "Collateral · Processor",
    title: "Collateral",
    lede: "Typed items, pledges, insurance. Collateral worker reviews the package.",
  },
  underwriter: {
    kicker: "Underwriter · Multi-agent",
    title: "Underwriter",
    lede: "Supervisor → policy pack + evaluator. Scorecard recommends. Diana Okonkwo decides.",
  },
  documents: {
    kicker: "Documents · Closer",
    title: "Closing package",
    lede: "Imaging ACK and review. A document is not filed without both.",
  },
  financing: {
    kicker: "Financing · Funding ops",
    title: "E-Tran",
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

            {!hydrated ? (
              <p className="text-ink-soft">Loading file…</p>
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
