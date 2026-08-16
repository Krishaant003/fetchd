import { useState } from 'react';
import type { IntakeFields } from '../types';

interface IntakeFieldSpec {
  key: keyof IntakeFields;
  label: string;
  isList?: boolean;
}

const INTAKE_FIELD_SPECS: IntakeFieldSpec[] = [
  { key: 'sex', label: 'Sex' },
  { key: 'color', label: 'Color' },
  { key: 'intake_date', label: 'Intake date' },
  { key: 'intake_source', label: 'Intake source' },
  { key: 'weight', label: 'Weight' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'body_condition_score', label: 'Body condition score' },
  { key: 'exam_notes', label: 'Exam notes' },
  { key: 'vaccine_records', label: 'Vaccine records (comma-separated)', isList: true },
  { key: 'deworming_flea_treatment', label: 'Deworming / flea treatment' },
  { key: 'microchip_number', label: 'Microchip number' },
  { key: 'spay_neuter_status', label: 'Spay/neuter status' },
  { key: 'spay_neuter_date', label: 'Spay/neuter date' },
  { key: 'current_medications', label: 'Current medications' },
  { key: 'diagnosed_conditions', label: 'Diagnosed conditions (comma-separated)', isList: true },
  { key: 'dietary_needs_allergies', label: 'Dietary needs / allergies' },
  { key: 'behavior_observations', label: 'Behavior observations' },
];

interface IntakeReviewFormProps {
  fields: IntakeFields;
  onChange: (fields: IntakeFields) => void;
}

function fieldValue(fields: IntakeFields, spec: IntakeFieldSpec): string {
  if (spec.isList) return ((fields[spec.key] as string[] | null | undefined) ?? []).join(', ');
  return (fields[spec.key] as string | null | undefined) ?? '';
}

function withFieldValue(fields: IntakeFields, spec: IntakeFieldSpec, raw: string): IntakeFields {
  if (spec.isList) {
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return { ...fields, [spec.key]: list };
  }
  return { ...fields, [spec.key]: raw.trim() === '' ? null : raw };
}

// Each field keeps its own local text buffer instead of deriving its
// displayed value from re-joining `fields` on every keystroke. For list
// fields, re-joining after each keystroke collapses a just-typed
// separator (e.g. the comma in "rabies, DHPP") before the next character
// lands, corrupting mid-edit input. The local buffer is seeded once from
// `fields` at mount — safe because after the initial extraction load, the
// only subsequent updates to `fields` come from this component's own
// onChange calls.
function IntakeField({ spec, fields, onChange }: { spec: IntakeFieldSpec; fields: IntakeFields; onChange: (fields: IntakeFields) => void }) {
  const [text, setText] = useState(() => fieldValue(fields, spec));

  return (
    <div>
      <label className="mb-1.5 block text-xs text-ink/70">{spec.label}</label>
      <input
        aria-label={spec.label}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(withFieldValue(fields, spec, e.target.value));
        }}
        className="w-full min-h-10 rounded-full border border-divider bg-surface-2 px-3.5 py-2 text-sm outline-none focus:border-clay"
      />
    </div>
  );
}

export function IntakeReviewForm({ fields, onChange }: IntakeReviewFormProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-6">
      <p className="mb-1 text-xs leading-relaxed text-ink/70">
        Review extracted intake data before saving. This data is never displayed publicly it's used solely to power
        compatibility matching between dogs and adopters
      </p>
      {INTAKE_FIELD_SPECS.map((spec) => (
        <IntakeField key={spec.key} spec={spec} fields={fields} onChange={onChange} />
      ))}
    </div>
  );
}
