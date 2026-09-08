import { MATRIX_LEGEND, MATRIX_STAGES, TABLE_MATRIX, type CellVerb } from "@/lib/blueprint/table-matrix";

const verbClass: Record<CellVerb, string> = {
  C: "bg-good-wash text-good",
  U: "bg-warn-wash text-warn",
  A: "bg-accent-wash text-navy",
  G: "bg-bad-wash text-bad",
  "C/U": "bg-good-wash text-good",
  "C/G": "bg-bad-wash text-bad",
  "U/G": "bg-bad-wash text-bad",
  "A/G": "bg-bad-wash text-bad",
};

export function TableMatrix() {
  return (
    <div className="my-6">
      <p className="font-mono text-[0.7rem] text-ink-faint mb-2">
        Tables written by stage — C create · U update · A assign · G gate
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {MATRIX_LEGEND.map((item) => (
          <span
            key={item.code}
            className={`font-mono text-[0.68rem] uppercase tracking-wide px-2 py-0.5 rounded-sm ${verbClass[item.code]}`}
          >
            {item.code} {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full text-[0.82rem] border-collapse min-w-[720px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white text-left font-semibold text-navy border-b-2 border-navy px-2.5 py-2 min-w-[11rem]">
                Table
              </th>
              {MATRIX_STAGES.map((s) => (
                <th
                  key={s.id}
                  className="text-center font-semibold text-navy border-b-2 border-navy px-1.5 py-2 whitespace-nowrap"
                >
                  <span className="block font-mono text-[0.65rem] text-accent">{s.id}</span>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_MATRIX.map((row) => (
              <tr key={row.table}>
                <td className="sticky left-0 bg-white font-medium text-navy px-2.5 py-2 border-b border-line whitespace-nowrap">
                  {row.table}
                </td>
                {row.cells.map((cell, i) => (
                  <td key={MATRIX_STAGES[i].id} className="text-center px-1 py-2 border-b border-line">
                    {cell ? (
                      <span
                        className={`inline-block font-mono text-[0.65rem] tracking-wide px-1.5 py-0.5 rounded-sm ${verbClass[cell]}`}
                      >
                        {cell}
                      </span>
                    ) : (
                      <span className="text-ink-faint">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
