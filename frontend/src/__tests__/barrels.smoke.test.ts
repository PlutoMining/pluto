import fs from 'fs';
import path from 'path';

function listIndexFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listIndexFiles(full));
      continue;
    }

    if (entry.isFile() && entry.name === 'index.ts') {
      out.push(full);
    }
  }

  return out;
}

describe('barrel exports smoke', () => {
  it('requires all index.ts barrel files', () => {
    const srcDir = path.resolve(__dirname, '..');
    const componentsDir = path.join(srcDir, 'components');
    const providerDir = path.join(srcDir, 'providers');

    const files = [...listIndexFiles(componentsDir), ...listIndexFiles(providerDir)];

    for (const file of files) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(file);
      const descriptors = Object.getOwnPropertyDescriptors(mod ?? {});
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (key === '__esModule') continue;

        // Re-exported symbols are often exposed via getters.
        if (typeof (descriptor as any).get === 'function') {
          (descriptor as any).get.call(mod);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          mod[key];
        }
      }
    }
  });
});
