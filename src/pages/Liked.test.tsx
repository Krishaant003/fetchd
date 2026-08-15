import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/api/swipes', () => ({
  fetchLikedProfiles: vi.fn().mockResolvedValue([
    { id: 'd1', name: 'Nutmeg', breed: 'Terrier mix', age: '5 years', photo_urls: ['https://example.com/nutmeg.jpg'] },
  ]),
}));

import { Liked } from './Liked';

describe('Liked', () => {
  it('shows liked profiles with breed/age and a waiting indicator', async () => {
    render(<Liked activeProfile={{ type: 'adopter', id: 'a1' }} />);

    expect(await screen.findByText('Nutmeg')).toBeInTheDocument();
    expect(screen.getByText('Terrier mix · 5 years')).toBeInTheDocument();
    expect(screen.getByText('Waiting to hear back')).toBeInTheDocument();
  });
});
