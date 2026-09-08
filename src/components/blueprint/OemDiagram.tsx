export function OemDiagram() {
  return (
    <div className="bg-white border border-line p-3 sm:p-5 mb-6 overflow-x-auto">
      <svg
        viewBox="0 0 980 500"
        className="w-full min-w-[720px] h-auto"
        role="img"
        aria-label="Operational entity model: Process parent, Customer, ApplicantAccount, Business, Loan"
      >
        <defs>
          <marker id="oem-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#6b7580" />
          </marker>
        </defs>
        <style>
          {`
            .ob{fill:#fbf9f4;stroke:#102536;stroke-width:1.2}
            .or{fill:#102536;stroke:#102536}
            .ot{font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;fill:#161c24}
            .ow{font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;fill:#fbf9f4}
            .os{font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;fill:#4a5562}
            .ol{stroke:#6b7580;stroke-width:1.1;fill:none;marker-end:url(#oem-arr)}
            .om{font-family:ui-monospace,Menlo,monospace;font-size:10px;fill:#d7e4ea}
          `}
        </style>

        <rect className="or" x="370" y="10" width="240" height="58" rx="3" />
        <text className="ow" x="490" y="34" textAnchor="middle">Process</text>
        <text className="om" x="490" y="52" textAnchor="middle">processId · parent of the file</text>

        <rect className="ob" x="20" y="120" width="180" height="54" rx="3" />
        <text className="ot" x="110" y="142" textAnchor="middle">Customer</text>
        <text className="os" x="110" y="158" textAnchor="middle">CIP · email · phone</text>

        <rect className="ob" x="220" y="120" width="180" height="54" rx="3" />
        <text className="ot" x="310" y="142" textAnchor="middle">Business</text>
        <text className="os" x="310" y="158" textAnchor="middle">operating company</text>

        <rect className="ob" x="420" y="120" width="180" height="54" rx="3" />
        <text className="ot" x="510" y="142" textAnchor="middle">Loan</text>
        <text className="os" x="510" y="158" textAnchor="middle">1:1 facility keepers</text>

        <rect className="ob" x="620" y="120" width="160" height="54" rx="3" />
        <text className="ot" x="700" y="142" textAnchor="middle">Participant</text>
        <text className="os" x="700" y="158" textAnchor="middle">roles[] on the file</text>

        <rect className="ob" x="800" y="120" width="160" height="54" rx="3" />
        <text className="ot" x="880" y="142" textAnchor="middle">ProcessTeam</text>
        <text className="os" x="880" y="158" textAnchor="middle">desk · staffId</text>

        <rect className="ob" x="20" y="230" width="180" height="54" rx="3" />
        <text className="ot" x="110" y="252" textAnchor="middle">ApplicantAccount</text>
        <text className="os" x="110" y="268" textAnchor="middle">authUserId · login</text>

        <rect className="ob" x="220" y="230" width="180" height="54" rx="3" />
        <text className="ot" x="310" y="252" textAnchor="middle">Address</text>
        <text className="os" x="310" y="268" textAnchor="middle">primary | mailing</text>

        <rect className="ob" x="420" y="230" width="180" height="54" rx="3" />
        <text className="ot" x="510" y="252" textAnchor="middle">CreditPull</text>
        <text className="os" x="510" y="268" textAnchor="middle">consumer + commercial</text>

        <rect className="ob" x="620" y="230" width="160" height="54" rx="3" />
        <text className="ot" x="700" y="252" textAnchor="middle">Sanctions</text>
        <text className="os" x="700" y="268" textAnchor="middle">OFAC / SDN</text>

        <rect className="ob" x="800" y="230" width="160" height="54" rx="3" />
        <text className="ot" x="880" y="252" textAnchor="middle">Decision</text>
        <text className="os" x="880" y="268" textAnchor="middle">human of record</text>

        <rect className="ob" x="220" y="340" width="180" height="50" rx="3" />
        <text className="ot" x="310" y="360" textAnchor="middle">KYB · SBA · Spreads</text>
        <text className="os" x="310" y="376" textAnchor="middle">stage 03</text>

        <rect className="ob" x="420" y="340" width="180" height="50" rx="3" />
        <text className="ot" x="510" y="360" textAnchor="middle">Collateral + Pledge</text>
        <text className="os" x="510" y="268" textAnchor="middle">pledged to Loan</text>

        <rect className="ob" x="620" y="340" width="160" height="50" rx="3" />
        <text className="ot" x="700" y="360" textAnchor="middle">Document</text>
        <text className="os" x="700" y="376" textAnchor="middle">imaged before filed</text>

        <rect className="ob" x="800" y="340" width="160" height="50" rx="3" />
        <text className="ot" x="880" y="360" textAnchor="middle">Guaranty · Ledger</text>
        <text className="os" x="880" y="376" textAnchor="middle">E-Tran · dual-control</text>

        <rect className="ob" x="370" y="430" width="240" height="50" rx="3" />
        <text className="ot" x="490" y="450" textAnchor="middle">AuditEvent + AuditSeal</text>
        <text className="os" x="490" y="466" textAnchor="middle">spine under processId</text>

        <line className="ol" x1="420" y1="68" x2="110" y2="120" />
        <line className="ol" x1="450" y1="68" x2="310" y2="120" />
        <line className="ol" x1="510" y1="68" x2="510" y2="120" />
        <line className="ol" x1="560" y1="68" x2="700" y2="120" />
        <line className="ol" x1="590" y1="68" x2="880" y2="120" />

        <line className="ol" x1="110" y1="174" x2="110" y2="230" />
        <line className="ol" x1="110" y1="174" x2="310" y2="230" />
        <line className="ol" x1="310" y1="174" x2="310" y2="230" />
        <line className="ol" x1="510" y1="174" x2="510" y2="230" />
        <line className="ol" x1="700" y1="174" x2="700" y2="230" />
        <line className="ol" x1="880" y1="174" x2="880" y2="230" />

        <line className="ol" x1="310" y1="284" x2="310" y2="340" />
        <line className="ol" x1="510" y1="284" x2="510" y2="340" />
        <line className="ol" x1="700" y1="284" x2="700" y2="340" />
        <line className="ol" x1="880" y1="284" x2="880" y2="340" />
        <line className="ol" x1="510" y1="390" x2="490" y2="430" />
      </svg>
      <p className="font-mono text-[0.7rem] text-ink-faint text-center mt-3 mb-0">
        Fig. Data model — Process is the parent. Customer binds ApplicantAccount. Loan is a 1:1 child.
      </p>
    </div>
  );
}
