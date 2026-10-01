interface FieldProps {
  label: string;
  unit?: string;
  value: string | number;
  onChange: (value: number | string) => void;
  type?: "number" | "text";
  min?: number;
  step?: number | "any";
  hint?: string;
}

export function Field({
  label,
  unit,
  value,
  onChange,
  type = "number",
  min,
  step = "any",
  hint,
}: FieldProps) {
  return (
    <label className="field">
      <span>{label}{unit ? <em>{unit}</em> : null}</span>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
