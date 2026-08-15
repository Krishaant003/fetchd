import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/profiles', () => ({
  createDogProfile: vi.fn().mockResolvedValue({ id: 'd1', story: 'Loves parks' }),
  createAdopterProfile: vi.fn(),
}));

import { CreateProfile } from './CreateProfile';

describe('CreateProfile', () => {
  it('submits a dog profile and calls onCreated', async () => {
    const onCreated = vi.fn();
    render(<CreateProfile sessionId="s1" profileType="dog" onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('name'), 'Rex');
    await userEvent.type(screen.getByLabelText('breed'), 'Mutt');
    await userEvent.type(screen.getByLabelText('age'), '2');
    await userEvent.type(screen.getByLabelText('story'), 'Loves parks');
    const file = new File(['data'], 'rex.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('photo'), file);
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ type: 'dog', id: 'd1' }, 'Loves parks'));
  });
});
