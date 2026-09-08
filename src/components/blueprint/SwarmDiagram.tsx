export function SwarmDiagram() {
  return (
    <div className="bg-white border border-line p-3 sm:p-5 mb-6 overflow-x-auto">
      <svg
        viewBox="0 0 1040 560"
        className="w-full min-w-[760px] h-auto"
        role="img"
        aria-label="Supervisor-coordinated swarm: stage workers, evaluator, human of record"
      >
        <defs>
          <marker id="sw-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#6b7580" />
          </marker>
        </defs>
        <style>
          {`
            .sb{fill:#fbf9f4;stroke:#102536;stroke-width:1.2}
            .sr{fill:#102536;stroke:#102536}
            .st{font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;fill:#161c24}
            .sw{font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;fill:#fbf9f4}
            .ss{font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;fill:#4a5562}
            .s2{font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;fill:#d7e4ea}
            .sl{stroke:#6b7580;stroke-width:1.1;fill:none;marker-end:url(#sw-arr)}
            .su{stroke:#6b7580;stroke-width:1.1;fill:none}
          `}
        </style>

        <rect className="sr" x="28" y="18" width="210" height="58" rx="3" />
        <text className="sw" x="133" y="42" textAnchor="middle">Process file</text>
        <text className="s2" x="133" y="60" textAnchor="middle">processId · currentStage</text>

        <line className="sl" x1="133" y1="76" x2="133" y2="108" />

        <rect className="sr" x="28" y="108" width="210" height="72" rx="3" />
        <text className="sw" x="133" y="134" textAnchor="middle">Supervisor / planner</text>
        <text className="s2" x="133" y="152" textAnchor="middle">decomposes the stage</text>
        <text className="s2" x="133" y="166" textAnchor="middle">dispatches workers</text>

        <line className="su" x1="238" y1="144" x2="262" y2="144" />
        <line className="su" x1="262" y1="47" x2="262" y2="251" />
        <line className="sl" x1="262" y1="47" x2="278" y2="47" />
        <line className="sl" x1="262" y1="115" x2="278" y2="115" />
        <line className="sl" x1="262" y1="183" x2="278" y2="183" />
        <line className="sl" x1="262" y1="251" x2="278" y2="251" />

        <rect className="sb" x="278" y="18" width="220" height="58" rx="3" />
        <text className="st" x="388" y="42" textAnchor="middle">CIP / identity</text>
        <text className="ss" x="388" y="58" textAnchor="middle">Customer · Account · Address</text>

        <rect className="sb" x="278" y="86" width="220" height="58" rx="3" />
        <text className="st" x="388" y="110" textAnchor="middle">Facility keepers</text>
        <text className="ss" x="388" y="126" textAnchor="middle">Business · Loan · participants</text>

        <rect className="sb" x="278" y="154" width="220" height="58" rx="3" />
        <text className="st" x="388" y="178" textAnchor="middle">Consumer credit</text>
        <text className="ss" x="388" y="194" textAnchor="middle">FCRA pull · artefactId</text>

        <rect className="sb" x="278" y="222" width="220" height="58" rx="3" />
        <text className="st" x="388" y="246" textAnchor="middle">Commercial credit</text>
        <text className="ss" x="388" y="262" textAnchor="middle">Experian Biz · SBFE · PAYDEX</text>

        <line className="su" x1="498" y1="47" x2="518" y2="47" />
        <line className="su" x1="498" y1="115" x2="518" y2="115" />
        <line className="su" x1="498" y1="183" x2="518" y2="183" />
        <line className="su" x1="498" y1="251" x2="518" y2="251" />

        <rect className="sb" x="518" y="18" width="220" height="58" rx="3" />
        <text className="st" x="628" y="42" textAnchor="middle">Sanctions / fraud</text>
        <text className="ss" x="628" y="58" textAnchor="middle">OFAC SDN · fail-closed</text>

        <rect className="sb" x="518" y="86" width="220" height="58" rx="3" />
        <text className="st" x="628" y="110" textAnchor="middle">Spreading / KYB</text>
        <text className="ss" x="628" y="126" textAnchor="middle">SbaProfile · spreads · debts</text>

        <rect className="sb" x="518" y="154" width="220" height="58" rx="3" />
        <text className="st" x="628" y="178" textAnchor="middle">Collateral</text>
        <text className="ss" x="628" y="194" textAnchor="middle">Item · Pledge · insurance</text>

        <rect className="sb" x="518" y="222" width="220" height="58" rx="3" />
        <text className="st" x="628" y="246" textAnchor="middle">Policy · docs · funding</text>
        <text className="ss" x="628" y="262" textAnchor="middle">Scorecard · E-Tran · ledger</text>

        <line className="su" x1="738" y1="144" x2="758" y2="144" />
        <line className="sl" x1="758" y1="144" x2="778" y2="144" />

        <rect className="sr" x="778" y="70" width="230" height="148" rx="3" />
        <text className="sw" x="893" y="100" textAnchor="middle">Evaluator / critic</text>
        <text className="s2" x="893" y="122" textAnchor="middle">grounding · artefactId</text>
        <text className="s2" x="893" y="138" textAnchor="middle">policy conflicts</text>
        <text className="s2" x="893" y="154" textAnchor="middle">confidence before package</text>
        <text className="s2" x="893" y="178" textAnchor="middle">low-confidence → human</text>
        <text className="s2" x="893" y="194" textAnchor="middle">never fills a gate</text>

        <line className="sl" x1="893" y1="218" x2="893" y2="250" />

        <rect className="sb" x="778" y="250" width="230" height="70" rx="3" />
        <text className="st" x="893" y="278" textAnchor="middle">Stage package</text>
        <text className="ss" x="893" y="296" textAnchor="middle">tables written · evidence trail</text>

        <line className="sl" x1="893" y1="320" x2="893" y2="352" />

        <rect className="sr" x="778" y="352" width="230" height="72" rx="3" />
        <text className="sw" x="893" y="378" textAnchor="middle">Human of record</text>
        <text className="s2" x="893" y="396" textAnchor="middle">RM · Credit · Processor</text>
        <text className="s2" x="893" y="410" textAnchor="middle">UW · Closer — stage owner</text>

        <rect className="sb" x="28" y="470" width="980" height="70" rx="3" />
        <text className="st" x="518" y="500" textAnchor="middle">
          Audit spine — AuditEvent under processId
        </text>
        <text className="ss" x="518" y="518" textAnchor="middle">
          Every dispatch, tool call, confidence score, and human gate is appended. Replay is from this log, not chat.
        </text>
      </svg>
      <p className="font-mono text-[0.7rem] text-ink-faint text-center mt-3 mb-0">
        Fig. Orchestration — supervisor dispatches the current stage’s workers; evaluator packages; human gates.
      </p>
    </div>
  );
}
