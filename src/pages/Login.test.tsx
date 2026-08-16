import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/auth', () => ({ logIn: vi.fn() }));

import { Login } from './Login';
import { logIn } from '../lib/auth';

describe('Login', () => {
  it('logs in and calls onLoggedIn on success', async () => {
    (logIn as any).mockResolvedValue(undefined);
    const onLoggedIn = vi.fn();
    render(
      <MemoryRouter>
        <Login onLoggedIn={onLoggedIn} />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('username'), 'jane');
    await userEvent.type(screen.getByLabelText('password'), 'pw12345');
    await userEvent.click(screen.getByText('Log in'));

    expect(logIn).toHaveBeenCalledWith('jane', 'pw12345');
    expect(onLoggedIn).toHaveBeenCalled();
  });

  it('shows an error message and does not call onLoggedIn when login fails', async () => {
    (logIn as any).mockRejectedValue(new Error('Incorrect username or password.'));
    const onLoggedIn = vi.fn();
    render(
      <MemoryRouter>
        <Login onLoggedIn={onLoggedIn} />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('username'), 'jane');
    await userEvent.type(screen.getByLabelText('password'), 'wrong');
    await userEvent.click(screen.getByText('Log in'));

    expect(await screen.findByText('Incorrect username or password.')).toBeInTheDocument();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });
});
