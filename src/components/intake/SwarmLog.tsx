import { useOrigination } from "@/lib/intake/store";

export function SwarmLog() {
  const events = useOrigination((s) => s.agentEvents);
  const llm = useOrigination((s) => s.llm);
  if (!events.length) return null;
  return (
    <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-lg mb-0">Agent log</h2>
        {llm ? <p className="text-xs text-ink-faint mb-0 font-mono">{llm.label}</p> : null}
      </div>
      <ol className="grid gap-2 mb-0">
        {events.slice(0, 12).map((ev) => (
          <li key={ev.eventId} className="rounded-md border border-line px-3 py-2">
            <p className="text-sm font-medium mb-0.5">
              {ev.agentName}
              <span className="font-mono text-[0.65rem] text-ink-faint ml-2 uppercase">{ev.kind}</span>
            </p>
            <p className="text-sm text-ink-soft mb-0">{ev.detail}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
