import { OEM_EDGES, OEM_TABLES } from "@/lib/blueprint/oem-model";
import { OemDiagram } from "../OemDiagram";
import { Callout, DocTable, H3, Lede, Section } from "../Primitives";

export function OemSection() {
  return (
    <Section id="oem" n="02" title="Data Model (OEM)">
      <Lede>
        Canonical tables for CygnusX-1 origination. Process is the aggregate root.
        Customer and Business are golden records. ApplicantAccount is the borrower
        login bound to Customer.email. Loan is a 1:1 facility child — created at intake
        after Business, not as the parent of the file.
      </Lede>
      <Callout>
        <strong>camelCase throughout.</strong> Raw SSN/EIN never persist — token plus last
        four. Consumer CreditPull carries FCRA purpose = this processId. Commercial
        CreditPull does not. SBSS is not a gate (SOP 50 10 8 / Notice 5000-875701).
      </Callout>
      <OemDiagram />
      <H3>Relationships</H3>
      <DocTable caption="Joins — Process is the parent" headers={["From", "To", "Join"]} rows={OEM_EDGES.map((e) => [...e])} />
      <H3>Table catalog</H3>
      <DocTable caption="When the row is born" headers={["Table", "PK", "Stage", "Purpose"]} rows={OEM_TABLES.map((t) => [t.name, t.pk, t.stage, t.purpose])} />
      <H3>Columns by table</H3>
      <div className="grid md:grid-cols-2 gap-4 my-5">
        {OEM_TABLES.map((t) => (
          <article key={t.name} className="bg-white border border-line p-4 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h4 className="font-serif text-navy text-base m-0">{t.name}</h4>
              <span className="font-mono text-[0.68rem] text-accent shrink-0">stage {t.stage}</span>
            </div>
            <p className="text-[0.82rem] text-ink-soft mb-3">{t.purpose}</p>
            <table className="w-full text-[0.8rem] border-collapse">
              <tbody>
                {t.columns.map(([col, note]) => (
                  <tr key={col}>
                    <td className="font-mono text-[0.72rem] text-navy pr-2 py-1 align-top whitespace-nowrap border-b border-line">{col}</td>
                    <td className="text-ink-soft py-1 border-b border-line">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </Section>
  );
}
