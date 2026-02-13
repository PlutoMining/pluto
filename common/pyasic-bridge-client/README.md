# @pluto/pyasic-bridge-client

TypeScript client for the pyasic-bridge service, auto-generated from the OpenAPI schema.

## Overview

This package provides a fully type-safe TypeScript client for communicating with the pyasic-bridge service. All code is auto-generated from the OpenAPI schema located at `common/contracts/pyasic-bridge-openapi.json`.

## Installation

```bash
cd common/pyasic-bridge-client
npm install
```

## Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Why do I only see a placeholder in `src/`?

Until you run the generator, `src/index.ts` is a **stub** (empty export) so the package can build. The **real TypeScript client** (API functions, types, and `client`) is created when you run:

```bash
python3 pyasic-bridge/scripts/generate_client.py
```

After that, `src/` will contain generated files such as `sdk.gen.ts`, `types.gen.ts`, `client.gen.ts`, and the package will export the full client and types.

## Regenerating the Client

When the OpenAPI schema changes, regenerate the client:

```bash
# From project root
python3 pyasic-bridge/scripts/generate_client.py

# Or from pyasic-bridge directory
cd pyasic-bridge
python3 scripts/generate_client.py

# If Poetry is configured (pyproject.toml exists):
cd pyasic-bridge
poetry run python scripts/generate_client.py
```

**Using npm script:**
```bash
# From this directory
npm run generate
```

## Usage

### Basic Example

```typescript
import { client } from '@pluto/pyasic-bridge-client';

// Initialize the client
const pyasicClient = client({
  baseUrl: process.env.PYASIC_BRIDGE_URL || 'http://pyasic-bridge:8000',
});

// Use the generated SDK methods
const miners = await pyasicClient.scanMiners({
  subnet: '192.168.1.0/24'
});

const minerData = await pyasicClient.getMinerData({
  ip: '192.168.1.100'
});
```

### With Custom Axios Instance

```typescript
import { client } from '@pluto/pyasic-bridge-client';
import axios from 'axios';

const customAxios = axios.create({
  baseURL: 'http://pyasic-bridge:8000',
  timeout: 5000,
  headers: {
    'Authorization': 'Bearer token'
  }
});

const pyasicClient = client({
  baseUrl: 'http://pyasic-bridge:8000',
  // Pass custom axios instance if needed
});
```

### Type Safety

All request and response types are automatically generated from the OpenAPI schema:

```typescript
import { client, types } from '@pluto/pyasic-bridge-client';

const pyasicClient = client({
  baseUrl: 'http://pyasic-bridge:8000',
});

// Types are automatically inferred
const response: types.ScanResponse = await pyasicClient.scanMiners({
  subnet: '192.168.1.0/24'
});
```

## Package Structure

```
common/pyasic-bridge-client/
├── src/                    # Generated client code (gitignored)
│   ├── client.gen.ts       # Client configuration
│   ├── types.gen.ts        # TypeScript type definitions
│   ├── sdk.gen.ts          # SDK methods
│   ├── index.ts            # Generated barrel exports
│   ├── client/             # HTTP client utilities
│   └── core/               # Core utilities
├── index.ts                # Main entry point (re-exports from src)
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Running Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

## Notes

- **Do not edit files in `src/`** - they are auto-generated and will be overwritten
- Always regenerate the client after changes to the OpenAPI schema
- The client uses Axios for HTTP requests
- All types are generated from the OpenAPI schema for full type safety
