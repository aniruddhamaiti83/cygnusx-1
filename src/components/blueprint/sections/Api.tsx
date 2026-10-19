import { Callout, DocTable, H3, Lede, Section } from "../Primitives";

const AUTH = [
  ["POST", "/api/cx1/auth/signup", "Creates the account. The session is an HttpOnly cookie."],
  ["POST", "/api/cx1/auth/login", "Same cookie. The token is not in the JSON body."],
  ["POST", "/api/cx1/auth/logout", "Deletes the session."],
  ["GET", "/api/cx1/auth/me", "The signed-in user, or empty."],
];

const FILE = [
  ["GET", "/api/cx1/health", "Database and which model is configured. No key."],
  ["GET", "/api/cx1/catalog", "Stages, staff, and products."],
  ["POST", "/api/cx1/processes", "Opens a file."],
  ["GET", "/api/cx1/processes/{id}", "The whole file. SSN and EIN tokens stay on the server."],
  ["PUT", "…/customer", "Person. The SSN is stored as a keyed token."],
  ["POST", "…/confirm-email", "Email plus the last four of the phone."],
  ["POST", "…/account", "Password, at least 8 characters. Binds the file."],
  ["PUT", "…/business", "Company and EIN."],
  ["PUT", "…/loan", "The loan."],
  ["POST", "…/advance", "Next stage, if the gate passes."],
];

const SWARM = [
  ["POST", "…/agents/run", "Runs only the current stage."],
  ["POST", "…/agents/consumer-credit", "One consumer pull."],
  ["POST", "…/agents/commercial-credit", "One business pull."],
  ["POST", "…/agents/sanctions", "Fraud screen."],
  ["POST", "…/agents/processing-pack", "KYB, size, SAM, and statements."],
  ["POST", "…/collateral", "Pledge and insurance."],
  ["POST", "…/decision", "A person approves, or rejects with a reason."],
  ["POST", "…/documents", "Image and review acknowledgement."],
  ["POST", "…/guaranty", "A person authorizes the guaranty."],
  ["POST", "…/ledger", "Dual-control post."],
];

export function ApiSection() {
  return (
    <Section id="api" n="API" title="Origination API">
      <Lede>
        FastAPI publishes the explorer at /api/cx1/docs. The preview proxies anything under
        /api/cx1. A bound file requires the owning session.
      </Lede>
      <p className="mb-5">
        <a
          href="/api/cx1/docs"
          className="inline-block bg-navy text-white rounded-md px-3.5 py-2 text-sm no-underline"
        >
          Open the API explorer
        </a>
      </p>
      <H3>Auth</H3>
      <DocTable caption="Session cookie" headers={["Method", "Path", "What it does"]} rows={AUTH} />
      <H3>File</H3>
      <DocTable caption="Paths hang off /api/cx1/processes/{id}" headers={["Method", "Path", "What it does"]} rows={FILE} />
      <H3>Swarm and decision</H3>
      <DocTable caption="Agents do not write the Decision" headers={["Method", "Path", "What it does"]} rows={SWARM} />
      <Callout>
        Pre-application passes if any one of consumer credit, commercial credit, or fraud passes.
        A credit proposal is releasable only at 97% confidence and under 3% hallucination. Those
        rules live in services.py and return 400.
      </Callout>
    </Section>
  );
}
