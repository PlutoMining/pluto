import '@testing-library/jest-dom';

if (!(global as any).ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (global as any).ResizeObserver = ResizeObserver;
}

if (!(global as any).matchMedia) {
  (global as any).matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

jest.mock('next/link', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ href, children, ...props }: any) => {
      const resolved =
        typeof href === 'string'
          ? href
          : href && typeof href === 'object'
            ? href.pathname || ''
            : '';
      return React.createElement('a', { href: resolved, ...props }, children);
    },
  };
});

jest.mock('recharts');
