import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';

describe('Landing', () => {
  it('calls onPickMode with the chosen type', async () => {
    const onPickMode = vi.fn();
    render(<Landing activeProfile={null} onPickMode={onPickMode} onContinue={vi.fn()} onLogout={vi.fn()} />);
    await userEvent.click(screen.getByText("I'm a Dog"));
    expect(onPickMode).toHaveBeenCalledWith('dog');
  });

  it('shows a Continue link with the profile name only when there is an active profile', () => {
    const { rerender } = render(
      <Landing activeProfile={null} onPickMode={vi.fn()} onContinue={vi.fn()} onLogout={vi.fn()} />
    );
    expect(screen.queryByText(/Continue as/)).not.toBeInTheDocument();

    rerender(
      <Landing
        activeProfile={{ type: 'dog', id: 'd1' }}
        profileName="Biscuit"
        onPickMode={vi.fn()}
        onContinue={vi.fn()}
        onLogout={vi.fn()}
      />
    );
    expect(screen.getByText('Continue as Biscuit')).toBeInTheDocument();
  });
});
