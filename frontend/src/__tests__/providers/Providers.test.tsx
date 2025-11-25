import React from 'react';
import { render, screen } from '@testing-library/react';
import { Providers } from '@/providers/Providers';

jest.mock('@/theme/theme', () => ({ themeToken: 'pluto-theme' }));

jest.mock('@chakra-ui/react', () => ({
  ChakraProvider: ({ children, theme }: any) => (
    <div data-testid="chakra" data-theme={theme.themeToken}>
      {children}
    </div>
  ),
}));

jest.mock('@/providers/SocketProvider', () => ({
  SocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="socket-provider">{children}</div>
  ),
}));

describe('Providers root wrapper', () => {
  it('composes ChakraProvider and SocketProvider', () => {
    render(
      <Providers>
        <span>content</span>
      </Providers>,
    );

    expect(screen.getByTestId('chakra')).toHaveAttribute('data-theme', 'pluto-theme');
    expect(screen.getByTestId('socket-provider')).toHaveTextContent('content');
  });
});

