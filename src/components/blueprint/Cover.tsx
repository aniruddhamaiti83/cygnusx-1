export function Cover() {
  return (
    <header className="relative overflow-hidden bg-navy text-paper px-[6vw] pt-16 pb-14 sm:pt-20 sm:pb-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 48px)",
        }}
      />
      <div className="relative max-w-[1150px]">
        <div className="flex justify-between items-end gap-4 flex-wrap font-mono text-[0.72rem] text-accent-soft border-b border-white/20 pb-4 mb-10">
          <span>SBA LENDING · PROJECT BLUEPRINT · CONFIDENTIAL</span>
          <span>CYGNUSX-1 · V1.3</span>
        </div>
        <p className="font-mono text-[0.72rem] tracking-[0.16em] uppercase text-accent-soft mb-4">
          Quote-to-cash origination
        </p>
        <h1 className="text-paper text-[clamp(2.1rem,4vw,3.2rem)] leading-[1.1] max-w-[19ch] mb-4">
          CygnusX-1 SBA Loan Origination Swarm
        </h1>
        <p className="text-paper-2 text-[1.1rem] max-w-[58ch] mb-6">
          Data model, process flow with table updates, and agent orchestration for 7(a),
          Express, and 504. Process is the parent of the file. A human underwriter of
          record approves every credit decision.
        </p>
        <div className="flex flex-wrap gap-3 mb-8">
          <a href="#oem" className="inline-flex items-center h-12 px-5 rounded-md bg-white text-navy font-medium no-underline hover:bg-paper-2 transition-colors duration-150">
            Data model
          </a>
          <a href="#stageflow" className="inline-flex items-center h-12 px-5 rounded-md border border-white/30 text-paper font-medium no-underline hover:bg-white/10 transition-colors duration-150">
            Process flow
          </a>
          <a href="#swarm" className="inline-flex items-center h-12 px-5 rounded-md border border-white/30 text-paper font-medium no-underline hover:bg-white/10 transition-colors duration-150">
            Orchestration
          </a>
          <a href="/cygnusx-1-blueprint.html" download="CygnusX-1-Blueprint.html" className="inline-flex items-center h-12 px-5 rounded-md border border-white/30 text-paper font-medium no-underline hover:bg-white/10 transition-colors duration-150">
            Download HTML
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 max-w-[1050px] border-t border-white/20 pt-5">
          {[
            ["Programme", "CygnusX-1"],
            ["Domain", "SBA origination"],
            ["Autonomy", "L2 → L3 (gated)"],
            ["Spine", "processId"],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="block font-mono text-[0.7rem] text-accent-soft mb-1">{k}</span>
              <span className="block text-[0.95rem]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
