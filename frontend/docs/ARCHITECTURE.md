# Architecture Documentation

## System Architecture

The Pluto Frontend follows a **Next.js App Router architecture** with client and server components:

```
┌─────────────────────────────────────────────────────────┐
│                    Browser                              │
│  (Client-Side React)                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js App Router                         │
│  (Server Components + Client Components)                │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Middleware      │              │  API Routes      │
│  (Proxy Layer)   │              │  (Socket.IO)     │
└──────────────────┘              └──────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Backend API     │              │  Backend Socket  │
│  (REST)          │              │  (Socket.IO)     │
└──────────────────┘              └──────────────────┘
```

## Design Paradigms

### 1. **App Router Pattern (Next.js 14)**
- File-based routing in `app/` directory
- Server Components by default
- Client Components with `"use client"` directive
- Layouts for shared UI
- Route groups for organization

### 2. **Component-Based Architecture**
- Reusable React components
- Component composition
- Props-based communication
- Context API for global state

### 3. **Provider Pattern**
- `SocketProvider`: Socket.IO connection management
- `LogStreamProvider`: Log streaming state
- `ChakraProvider`: Theme and UI context

### 4. **Middleware Pattern**
- Request/response interception
- API proxying to backend
- Grafana proxying
- Header manipulation

### 5. **State Management**
- React hooks (`useState`, `useEffect`)
- Context API for global state
- Socket.IO for real-time updates
- Server state via API calls

## Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   └── app-version/     # App version endpoint
│   ├── devices/             # Devices page
│   ├── monitoring/          # Monitoring pages
│   │   └── [id]/            # Dynamic device monitoring
│   ├── presets/             # Presets page
│   ├── device-settings/     # Device settings page
│   ├── settings/            # Settings page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home/Overview page
│   └── globals.css          # Global styles
│
├── components/               # React components
│   ├── Accordion/           # Accordion components
│   ├── Alert/               # Alert/notification
│   ├── Badge/               # Badge components
│   ├── Button/              # Button component
│   ├── Checkbox/            # Checkbox component
│   ├── Footer/              # Footer component
│   ├── icons/               # Icon components
│   ├── Input/               # Input components
│   ├── Link/                # Link component
│   ├── Modal/               # Modal components
│   ├── NavBar/              # Navigation bar
│   ├── PresetEditor/        # Preset editor
│   ├── ProgressBar/         # Progress indicators
│   ├── RadioButton/         # Radio button
│   ├── Section/             # Section components
│   ├── Select/              # Select dropdown
│   └── Table/               # Table components
│
├── providers/                # Context providers
│   ├── SocketProvider.tsx   # Socket.IO provider
│   ├── LogStreamProvider.tsx # Log stream provider
│   └── Providers.tsx        # Provider composition
│
├── theme/                    # Theme configuration
│   ├── theme.ts             # Main theme
│   ├── colors.ts            # Color definitions
│   └── typography.ts        # Typography settings
│
├── utils/                    # Utility functions
│   ├── formatTime.ts        # Time formatting
│   ├── iframe.ts            # Iframe styling
│   └── minerMap.ts          # Miner mapping
│
├── middleware.ts             # Next.js middleware
└── pages/                    # Pages Router (legacy)
    └── api/
        └── socket/
            └── io.ts        # Socket.IO API route
```

## Data Flow

### Page Load Flow

```
1. Browser Request
   ↓
2. Next.js Server
   ├─→ Server Component Rendering
   ├─→ Layout Application
   └─→ Initial HTML
   ↓
3. Client Hydration
   ├─→ React Hydration
   ├─→ Provider Initialization
   ├─→ Socket.IO Connection
   └─→ API Data Fetching
   ↓
4. Interactive UI
```

### Real-Time Update Flow

```
1. Backend Event (stat_update)
   ↓
2. Backend Socket.IO Server
   ↓
3. Next.js API Route (/api/socket/io)
   ├─→ Forwards to Client Socket
   ↓
4. Client Socket.IO
   ↓
5. SocketProvider Context
   ↓
6. Component Event Listeners
   ↓
7. State Update
   ↓
8. UI Re-render
```

### API Request Flow

```
1. Component API Call
   ↓
2. Axios Request (/api/...)
   ↓
3. Next.js Middleware
   ├─→ Checks Route Type
   ├─→ Proxies to Backend
   └─→ Adds Headers
   ↓
4. Backend API
   ↓
5. Response
   ↓
6. Component State Update
```

## Component Architecture

### Server vs Client Components

**Server Components** (default):
- Rendered on server
- No client-side JavaScript
- Can access server resources
- Used for: Layouts, initial data fetching

**Client Components** (`"use client"`):
- Rendered on client
- Can use hooks and browser APIs
- Interactive components
- Used for: Forms, real-time updates, user interactions

### Component Hierarchy

```
RootLayout (Server)
  └─→ Providers (Client)
      └─→ ChakraProvider
          └─→ SocketProvider
              └─→ Page Components (Client)
                  └─→ Feature Components
                      └─→ UI Components
```

## State Management

### Local State
- `useState` for component-specific state
- Component-level state management
- Props for parent-child communication

### Global State
- `SocketProvider`: Socket.IO connection, device list
- `LogStreamProvider`: Log streaming state
- Context API for cross-component state

### Server State
- API calls via Axios
- No caching layer (consider React Query)
- Manual refetching

### Real-Time State
- Socket.IO events update state
- Event listeners in `useEffect`
- State updates trigger re-renders

## Routing

### App Router Structure

- `/` - Overview/Home page
- `/devices` - Device management
- `/monitoring` - Monitoring dashboard list
- `/monitoring/[id]` - Individual device monitoring
- `/presets` - Preset management
- `/device-settings` - Device settings
- `/settings` - Application settings

### Dynamic Routes
- `[id]` - Dynamic parameter
- Example: `/monitoring/[id]` → `/monitoring/mockaxe1`

### API Routes
- `/api/app-version` - App version endpoint
- `/api/socket/io` - Socket.IO setup

## Middleware

### Purpose
- API request proxying
- Grafana request proxying
- Header manipulation
- Route filtering

### Flow
1. Request interception
2. Route matching (`/api/*`, `/grafana/*`)
3. URL rewriting
4. Header addition
5. Response forwarding

## Theme System

### Chakra UI Theme
- Custom theme extension
- Semantic color tokens
- Dark/light mode support
- Custom breakpoints
- Typography configuration

### Color System
- Semantic tokens (e.g., `bg-color`, `body-text`)
- Light/dark variants
- Component-specific colors
- Alert colors (success, error, warning)

### Typography
- Custom fonts (Clash Display, Azeret Mono)
- Font sizes and weights
- Responsive typography

## Styling Approach

### CSS-in-JS (Emotion)
- Chakra UI uses Emotion
- Component-level styling
- Theme integration
- Responsive design

### Global Styles
- `globals.css` for global styles
- Font imports
- CSS variables (via Chakra)

### Responsive Design
- Breakpoints: mobile, tablet, desktop
- Mobile-first approach
- Responsive props in Chakra components

## API Integration

### REST API
- Axios for HTTP requests
- Proxied through middleware
- Error handling
- Type-safe with TypeScript

### Socket.IO
- Client-side Socket.IO
- Server-side proxy route
- Real-time event handling
- Reconnection logic

## Error Handling

1. **API Errors**: Try-catch blocks, error states
2. **Socket Errors**: Error event listeners
3. **Component Errors**: Error boundaries (consider adding)
4. **Network Errors**: Axios interceptors (consider adding)

## Performance Considerations

1. **Code Splitting**: Automatic with Next.js
2. **Image Optimization**: Next.js Image component (if used)
3. **Bundle Size**: Tree shaking, dynamic imports
4. **Server Components**: Reduce client bundle
5. **Caching**: Consider React Query or SWR

## Security Considerations

1. **API Proxying**: Prevents CORS issues
2. **No Authentication**: Currently no auth (consider adding)
3. **XSS Protection**: React's built-in escaping
4. **CSRF Protection**: Consider adding tokens

## Dependencies

### Core
- **Next.js 14.2+**: React framework
- **React 18**: UI library
- **TypeScript 5+**: Type safety

### UI
- **Chakra UI 2.8+**: Component library
- **Emotion**: CSS-in-JS
- **Framer Motion**: Animations

### Data
- **Axios**: HTTP client
- **Socket.IO Client**: Real-time communication

### Utilities
- **D3.js**: Data visualization
- **radash**: Utility functions
- **uuid**: UUID generation

### Internal
- `@pluto/interfaces`: Type definitions
- `@pluto/utils`: Utility functions

