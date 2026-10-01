import { OemDiagram } from "../OemDiagram";
import { Callout, Lede, Section } from "../Primitives";

export function OemSection() {
  return (
    <Section id="oem" n="02" title="Data Model (Schema)">
      <Lede>
        Account is the customer: a Person Account for an individual, a Business
        Account for the company. Deal is the file, and the red line is its
        master-detail to that Account. LOS Product is the loan — a Deal can hold
        more than one. Related parties, collateral, metrics, the credit decision,
        and requirements all hang off the loan.
      </Lede>
      <Callout>
        <strong>How to read it —</strong> required fields have a red tick on the left.
        Blue lines are lookups. The red line is Deal to Account. A guarantor,
        co-borrower, or authorized signor is a Related Party on that LOS Product,
        pointing at an Account. Drag the objects.
      </Callout>
      <OemDiagram />
    </Section>
  );
}
