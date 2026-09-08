import type { Step } from "@/lib/intake/store";

const STEPS: { id: Step; n: string; label: string }[] = [
  { id: "customer", n: "01", label: "Customer" },
  { id: "account", n: "02", label: "Account" },
  { id: "business", n: "03", label: "Business" },
  { id: "loan", n: "04", label: "Loan" },
];

export function Stepper({
  current,
  unlocked,
  onSelect,
}: {
  current: Step;
  unlocked: Step[];
  onSelect: (step: Step) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-2 mb-8">
      {STEPS.map((s, i) => {
        const on = s.id === current;
        const open = unlocked.includes(s.id);
        return (
          <li key={s.id} className="flex items-center min-w-0">
            <button
              type="button"
              disabled={!open}
              onClick={() => onSelect(s.id)}
              className={`h-11 px-3 rounded-md text-left border text-sm ${
                on
                  ? "bg-navy text-paper border-navy"
                  : open
                    ? "bg-white text-ink border-line hover:border-accent"
                    : "bg-paper-2 text-ink-faint border-line opacity-60"
              }`}
            >
              <span className="font-mono text-[0.65rem] opacity-70 mr-1.5">{s.n}</span>
              {s.label}
            </button>
            {i < STEPS.length - 1 ? (
              <span className="hidden sm:block w-4 h-px bg-line mx-1" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
