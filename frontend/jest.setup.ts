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
  const Link = React.forwardRef(({ href, children, ...props }: any, ref: any) => {
    const resolved =
      typeof href === 'string'
        ? href
        : href && typeof href === 'object'
          ? href.pathname || ''
          : '';
    return React.createElement('a', { href: resolved, ref, ...props }, children);
  });
  Link.displayName = 'NextLink';
  return {
    __esModule: true,
    default: Link,
  };
});

jest.mock('recharts');

jest.mock('next/font/google', () => ({
  __esModule: true,
  Azeret_Mono: () => ({
    style: {
      fontFamily: 'Azeret Mono',
    },
  }),
}));

// Jest + jsdom doesn't always provide fetch.
if (!(global as any).fetch) {
  (global as any).fetch = () => {
    throw new Error("fetch is not mocked");
  };
}

// Some tests intentionally click anchor tags, and jsdom logs a noisy error when it tries to
// perform real navigation. Filter only that specific message.
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (args.some((arg) => String(arg).includes("Not implemented: navigation"))) {
    return;
  }
  return originalConsoleError(...args);
};
