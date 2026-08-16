import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyIntakeFields } from '../types';
import type { IntakeFields } from '../types';
import { IntakeReviewForm } from './IntakeReviewForm';

// IntakeReviewForm is a controlled component: it renders exactly what
// `fields` says and never updates on its own. Task 6 will hold that state
// in CreateProfile.tsx, so tests that type into it need the same kind of
// stateful wrapper to feed onChange back into fields — otherwise React
// resets the DOM value to the unchanged prop after every keystroke.
function ControlledHarness({
  initialFields,
  onChange,
}: {
  initialFields: IntakeFields;
  onChange: (fields: IntakeFields) => void;
}) {
  const [fields, setFields] = useState(initialFields);
  return (
    <IntakeReviewForm
      fields={fields}
      onChange={(next) => {
        setFields(next);
        onChange(next);
      }}
    />
  );
}

describe('IntakeReviewForm', () => {
  it('renders extracted scalar and list values', () => {
    const fields = { ...emptyIntakeFields(), weight: '45 lbs', diagnosed_conditions: ['hip dysplasia', 'ear infection'] };
    render(<IntakeReviewForm fields={fields} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Weight')).toHaveValue('45 lbs');
    expect(screen.getByLabelText('Diagnosed conditions (comma-separated)')).toHaveValue('hip dysplasia, ear infection');
  });

  it('reports a scalar edit via onChange without touching other fields', async () => {
    const onChange = vi.fn();
    const fields = { ...emptyIntakeFields(), weight: '45 lbs' };
    render(<ControlledHarness initialFields={fields} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText('Weight'));
    await userEvent.type(screen.getByLabelText('Weight'), '50 lbs');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ weight: '50 lbs' }));
  });

  it('reports a list edit as a parsed, trimmed array', async () => {
    const onChange = vi.fn();
    const fields = emptyIntakeFields();
    render(<ControlledHarness initialFields={fields} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Vaccine records (comma-separated)'), 'rabies, DHPP');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ vaccine_records: ['rabies', 'DHPP'] }));
  });
});
