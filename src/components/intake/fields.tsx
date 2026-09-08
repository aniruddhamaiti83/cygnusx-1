import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import type { PostalAddress } from "@/lib/intake/model";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const child = Children.only(children);
  const id =
    isValidElement(child) && typeof (child.props as { id?: string }).id === "string"
      ? (child.props as { id: string }).id
      : `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const control = isValidElement(child)
    ? cloneElement(child as ReactElement<{ id?: string }>, { id })
    : child;
  return (
    <div className="block min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-navy mb-1.5">
        {label}
        {required ? <span className="text-bad ml-0.5">*</span> : null}
      </label>
      {control}
      {error ? <p className="mt-1 text-sm text-bad">{error}</p> : null}
      {!error && hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}

const control =
  "w-full h-11 px-3 rounded-md bg-white border border-line text-ink text-base outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-2 focus:ring-accent-wash";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={control} {...props} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${control} disabled:opacity-60`} {...props}>
      {children}
    </select>
  );
}

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
];

export function AddressFields({
  value,
  onChange,
  idPrefix,
}: {
  value: PostalAddress;
  onChange: (next: PostalAddress) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Street" required>
        <TextInput
          id={`${idPrefix}-line1`}
          autoComplete="address-line1"
          value={value.line1}
          onChange={(e) => onChange({ ...value, line1: e.target.value })}
        />
      </Field>
      <Field label="Suite / unit">
        <TextInput
          id={`${idPrefix}-line2`}
          autoComplete="address-line2"
          value={value.line2}
          onChange={(e) => onChange({ ...value, line2: e.target.value })}
        />
      </Field>
      <div className="grid sm:grid-cols-[1fr_5.5rem_7rem] gap-3">
        <Field label="City" required>
          <TextInput
            id={`${idPrefix}-city`}
            autoComplete="address-level2"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
        </Field>
        <Field label="State" required>
          <Select
            id={`${idPrefix}-state`}
            autoComplete="address-level1"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
          >
            <option value="">—</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ZIP" required>
          <TextInput
            id={`${idPrefix}-zip`}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
