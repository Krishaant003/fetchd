import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/auth', () => ({ signUp: vi.fn() }));

import { Signup } from './Signup';
import { signUp } from '../lib/auth';

describe('Signup', () => {
  it('signs up and calls onSignedUp on success', async () => {
    (signUp as any).mockResolvedValue(undefined);
    const onSignedUp = vi.fn();
    render(
      <MemoryRouter>
        <Signup onSignedUp={onSignedUp} />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('username'), 'jane');
    await userEvent.type(screen.getByLabelText('password'), 'pw12345');
    await userEvent.click(screen.getByText('Sign up'));

    expect(signUp).toHaveBeenCalledWith('jane', 'pw12345');
    expect(onSignedUp).toHaveBeenCalled();
  });

  it('shows an error message and does not call onSignedUp when signup fails', async () => {
    (signUp as any).mockRejectedValue(new Error('That username is taken — try another.'));
    const onSignedUp = vi.fn();
    render(
      <MemoryRouter>
        <Signup onSignedUp={onSignedUp} />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('username'), 'jane');
    await userEvent.type(screen.getByLabelText('password'), 'pw12345');
    await userEvent.click(screen.getByText('Sign up'));

    expect(await screen.findByText('That username is taken — try another.')).toBeInTheDocument();
    expect(onSignedUp).not.toHaveBeenCalled();
  });
});
