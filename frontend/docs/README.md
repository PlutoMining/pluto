# Pluto Frontend Documentation

## Overview

The Pluto Frontend is a Next.js 14 web application that provides a user interface for managing Bitcoin mining devices (Bitaxe miners). It features real-time device monitoring, configuration management, preset management, and integration with Grafana dashboards.

## Table of Contents

- [Architecture](./ARCHITECTURE.md) - System architecture, structure, and design paradigms
- [Components](./COMPONENTS.md) - Detailed documentation of all components
- [Pages](./PAGES.md) - Page documentation and routing
- [Development Guide](./DEVELOPMENT.md) - How to run, debug, and develop
- [API Integration](./API_INTEGRATION.md) - Backend API integration and Socket.IO

## Quick Start

### Prerequisites

- Node.js 24+
- npm or yarn

### Environment Variables

The frontend requires the following environment variables:

```bash
BACKEND_DESTINATION_HOST=http://localhost:3000  # Backend service URL
GF_HOST=http://localhost:3001                   # Grafana host URL
```

### Installation

```bash
cd frontend
npm install
```

### Running

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

**Linting:**
```bash
npm run lint
```

### Docker

**Production:**
```bash
docker build -f Dockerfile -t pluto-frontend .
docker run -p 3000:3000 -e BACKEND_DESTINATION_HOST=http://backend:3000 -e GF_HOST=http://grafana:3001 pluto-frontend
```

**Development:**
```bash
docker build -f Dockerfile.development -t pluto-frontend-dev .
docker run -p 3000:3000 -v $(pwd):/home/node/app pluto-frontend-dev
```

## Key Features

1. **Device Management**
   - Device discovery and registration
   - Device list with real-time updates
   - Device configuration editing
   - Device deletion

2. **Real-Time Monitoring**
   - Socket.IO integration for live updates
   - Device status badges (online/offline)
   - Real-time metrics display
   - Grafana dashboard integration

3. **Preset Management**
   - Create and manage device configuration presets
   - Apply presets to devices
   - Preset editor with validation

4. **Monitoring Dashboards**
   - Overview dashboard (all devices)
   - Individual device monitoring pages
   - Grafana dashboard embedding
   - Custom iframe styling

5. **User Interface**
   - Responsive design (mobile, tablet, desktop)
   - Dark/light mode support
   - Custom theme with Clash Display font
   - Accessible components

## Technology Stack

- **Framework:** Next.js 14.2+ (App Router)
- **Language:** TypeScript 5+
- **UI Library:** Chakra UI 2.8+
- **Styling:** Emotion (CSS-in-JS)
- **Real-Time:** Socket.IO Client 4.7+
- **HTTP Client:** Axios 1.7+
- **Animations:** Framer Motion 11.11+
- **Data Visualization:** D3.js 7.9+
- **Icons:** Custom SVG icons + Chakra UI icons

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── devices/      # Devices page
│   │   ├── monitoring/   # Monitoring pages
│   │   ├── presets/      # Presets page
│   │   ├── device-settings/ # Device settings page
│   │   ├── settings/     # Settings page
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   │   ├── Accordion/    # Accordion components
│   │   ├── Alert/        # Alert components
│   │   ├── Badge/        # Badge components
│   │   ├── Button/        # Button component
│   │   ├── Modal/        # Modal components
│   │   ├── Table/        # Table components
│   │   └── ...           # Other components
│   ├── providers/        # React context providers
│   │   ├── SocketProvider.tsx
│   │   └── LogStreamProvider.tsx
│   ├── theme/            # Theme configuration
│   │   ├── theme.ts
│   │   ├── colors.ts
│   │   └── typography.ts
│   ├── utils/            # Utility functions
│   ├── middleware.ts     # Next.js middleware
│   └── pages/            # Pages Router (API routes)
│       └── api/
│           └── socket/
│               └── io.ts
├── public/               # Static assets
│   └── fonts/           # Custom fonts
├── docs/                 # Documentation (this directory)
├── Dockerfile            # Production Docker image
├── Dockerfile.development # Development Docker image
├── next.config.mjs       # Next.js configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Common Packages

The frontend uses internal packages from the `common/` directory:

- `@pluto/interfaces` - TypeScript interfaces and types
- `@pluto/utils` - Utility functions

## How It Works

1. **API Proxying**
   - Middleware proxies `/api/*` requests to backend
   - Middleware proxies `/grafana/*` requests to Grafana
   - Internal API routes handle Socket.IO setup

2. **Real-Time Updates**
   - Socket.IO client connects to backend via proxy
   - Receives `stat_update`, `error`, `device_removed` events
   - Updates UI in real-time

3. **Page Rendering**
   - Server-side rendering for initial load
   - Client-side hydration for interactivity
   - Dynamic routes for device-specific pages

4. **Theme System**
   - Chakra UI theme with custom colors
   - Dark/light mode support
   - Semantic color tokens
   - Custom typography

## Next Steps

- Read the [Architecture Documentation](./ARCHITECTURE.md) to understand the system design
- Check the [Components Documentation](./COMPONENTS.md) for component details
- Review the [Pages Documentation](./PAGES.md) for page structure
- Follow the [Development Guide](./DEVELOPMENT.md) for development workflows
- Understand the [API Integration](./API_INTEGRATION.md) for backend communication

