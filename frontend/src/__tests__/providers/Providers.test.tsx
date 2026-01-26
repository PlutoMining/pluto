import React from 'react';
import { render, screen } from '@testing-library/react';
import { Providers } from '@/providers/Providers';

jest.mock('@/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

describe('Providers root wrapper', () => {
  it('wraps children in ThemeProvider', () => {
    render(
      <Providers>
        <span>content</span>
      </Providers>,
    );

    expect(screen.getByTestId('theme-provider')).toHaveTextContent('content');
  });
});
