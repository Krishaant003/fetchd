import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/profiles', () => ({
  createDogProfile: vi.fn().mockResolvedValue({
    id: 'd1',
    answer_1: 'a1',
    answer_2: 'a2',
    answer_3: 'a3',
    answer_4: 'a4',
    answer_5: 'a5',
  }),
  createAdopterProfile: vi.fn(),
  updateDogProfile: vi.fn(),
  updateAdopterProfile: vi.fn(),
}));

import { CreateProfile } from './CreateProfile';

async function fillRequiredTextFields() {
  await userEvent.type(screen.getByLabelText('name'), 'Rex');
  await userEvent.type(screen.getByLabelText('breed'), 'Mutt');
  await userEvent.type(screen.getByLabelText('age'), '2');
  for (let i = 1; i <= 5; i++) {
    await userEvent.type(screen.getByLabelText(`answer ${i}`), `a${i}`);
  }
}

async function uploadAllPhotos() {
  for (let i = 1; i <= 4; i++) {
    const file = new File([`${i}`], `rex${i}.jpg`, { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText(`photo ${i}`), file);
  }
}

describe('CreateProfile', () => {
  it('blocks submission and shows an error when a photo is missing', async () => {
    render(<CreateProfile sessionId="s1" profileType="dog" onCreated={vi.fn()} />);

    await fillRequiredTextFields();
    // Only upload 3 of the 4 required photos.
    for (let i = 1; i <= 3; i++) {
      const file = new File([`${i}`], `rex${i}.jpg`, { type: 'image/jpeg' });
      await userEvent.upload(screen.getByLabelText(`photo ${i}`), file);
    }

    await userEvent.click(screen.getByText('Enter Fetch Match'));

    expect(screen.getByText(/slot 4 — required/i)).toBeInTheDocument();
  });

  it('submits a dog profile with all 4 photos and 5 answers, and calls onCreated', async () => {
    const onCreated = vi.fn();
    render(<CreateProfile sessionId="s1" profileType="dog" onCreated={onCreated} />);

    await fillRequiredTextFields();
    await uploadAllPhotos();
    await userEvent.click(screen.getByText('Enter Fetch Match'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ type: 'dog', id: 'd1' }, 'a1 a2 a3 a4 a5'));
  });
});
