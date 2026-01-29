/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React from 'react';

jest.mock('@/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: any) => React.createElement('div', null, children),
}));

import { Providers } from '@/providers';

describe('providers/index', () => {
  it('should export Providers component', () => {
    expect(Providers).toBeDefined();
    expect(typeof Providers).toBe('function');
  });
});
