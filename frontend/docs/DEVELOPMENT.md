# Development Guide

This guide covers how to run, debug, and develop the Pluto Frontend.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Debugging](#debugging)
- [Testing](#testing)
- [Docker Development](#docker-development)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: Version 24 or higher
- **npm**: Comes with Node.js
- **TypeScript**: Installed as dev dependency
- **Git**: For version control

### Environment Setup

Create a `.env.local` file in the `frontend/` directory (or set environment variables):

```bash
BACKEND_DESTINATION_HOST=http://localhost:3000
GF_HOST=http://localhost:3001
```

---

## Local Development

### Initial Setup

1. **Install Dependencies**

   ```bash
   cd frontend
   npm install
   ```

   This will also install dependencies from the `common/` packages:
   - `@pluto/interfaces`
   - `@pluto/utils`

2. **Build Common Packages** (if needed)

   ```bash
   cd ../common/interfaces && npm run build
   cd ../utils && npm run build
   ```

3. **Start Development Server**

   ```bash
   cd frontend
   npm run dev
   ```

   This starts the Next.js development server with:
   - Hot reload
   - Fast Refresh
   - TypeScript compilation
   - Development optimizations

   Server runs on: `http://localhost:3000`

### Development Scripts

- **`npm run dev`**: Start development server
- **`npm run build`**: Build for production
- **`npm start`**: Run production build
- **`npm run lint`**: Run ESLint

### File Watching

Next.js automatically watches for changes in:
- `src/**/*.{ts,tsx,js,jsx}` - Source files
- `public/**/*` - Static assets
- Configuration files

Changes trigger automatic reload.

---

## Debugging

### Browser DevTools

1. **Open DevTools**
   - Chrome/Edge: F12 or Ctrl+Shift+I
   - Firefox: F12 or Ctrl+Shift+I
   - Safari: Cmd+Option+I

2. **React DevTools**
   - Install React DevTools browser extension
   - Inspect component tree
   - View component props and state

3. **Network Tab**
   - Monitor API requests
   - Check Socket.IO connections
   - Inspect request/response data

### VS Code Debugging

1. **Create Launch Configuration**

   Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Next.js: debug server-side",
         "type": "node-terminal",
         "request": "launch",
         "command": "npm run dev"
       },
       {
         "name": "Next.js: debug client-side",
         "type": "chrome",
         "request": "launch",
         "url": "http://localhost:3000",
         "webRoot": "${workspaceFolder}/frontend"
       }
     ]
   }
   ```

2. **Set Breakpoints**
   - Set breakpoints in TypeScript/TSX files
   - Debug server-side code
   - Debug client-side code

### Console Logging

**Client-Side:**
```typescript
console.log("Debug message", data);
console.error("Error:", error);
console.warn("Warning:", warning);
```

**Server-Side:**
```typescript
// In API routes or server components
console.log("Server log:", data);
```

### React DevTools

1. **Component Inspector**
   - View component hierarchy
   - Inspect props and state
   - View hooks

2. **Profiler**
   - Profile component renders
   - Identify performance issues
   - Optimize re-renders

---

## Testing

Currently, there are no automated tests. Consider adding:

1. **Unit Tests** (Jest/React Testing Library)
   - Test component rendering
   - Test user interactions
   - Test utility functions

2. **Integration Tests**
   - Test API integration
   - Test Socket.IO integration
   - Test form submissions

3. **E2E Tests** (Playwright/Cypress)
   - Test user flows
   - Test device management
   - Test real-time updates

### Manual Testing

**Test Device Management:**
1. Navigate to `/devices`
2. Click "Register Devices"
3. Select devices
4. Register
5. Verify devices appear in list

**Test Real-Time Updates:**
1. Open `/devices` page
2. Monitor Socket.IO connection in DevTools
3. Verify `stat_update` events received
4. Verify UI updates in real-time

**Test API Integration:**
1. Open Network tab in DevTools
2. Perform actions (register, update, delete)
3. Verify API requests
4. Check responses

---

## Docker Development

### Development Dockerfile

The `Dockerfile.development` is minimal and expects:
- Dependencies pre-installed
- Source code mounted as volume
- Environment variables set

### Running in Docker

1. **Build Image**

   ```bash
   docker build -f Dockerfile.development -t pluto-frontend-dev .
   ```

2. **Run Container**

   ```bash
   docker run -it --rm \
     -p 3000:3000 \
     -v $(pwd):/home/node/app \
     -e BACKEND_DESTINATION_HOST=http://host.docker.internal:3000 \
     -e GF_HOST=http://host.docker.internal:3001 \
     pluto-frontend-dev
   ```

   **Note:** Use `host.docker.internal` to access services on host machine.

### Debugging in Docker

1. **Expose Ports**

   ```bash
   docker run -it --rm \
     -p 3000:3000 \
     -v $(pwd):/home/node/app \
     pluto-frontend-dev
   ```

2. **Access DevTools**

   - Connect to `http://localhost:3000`
   - Use browser DevTools
   - Hot reload works with volume mount

---

## Common Tasks

### Adding a New Page

1. **Create Page File**

   ```tsx
   // src/app/my-page/page.tsx
   "use client";
   
   export default function MyPage() {
     return <div>My Page</div>;
   }
   ```

2. **Add Navigation** (optional)

   ```tsx
   // In NavBar component
   <Link href="/my-page">My Page</Link>
   ```

### Adding a New Component

1. **Create Component File**

   ```tsx
   // src/components/MyComponent/MyComponent.tsx
   interface MyComponentProps {
     title: string;
   }
   
   export const MyComponent = ({ title }: MyComponentProps) => {
     return <div>{title}</div>;
   };
   ```

2. **Create Index File**

   ```tsx
   // src/components/MyComponent/index.ts
   export { MyComponent } from "./MyComponent";
   ```

3. **Use Component**

   ```tsx
   import { MyComponent } from "@/components/MyComponent";
   
   <MyComponent title="Hello" />
   ```

### Adding a New API Endpoint

1. **Create Route Handler**

   ```tsx
   // src/app/api/my-endpoint/route.ts
   import { NextRequest, NextResponse } from "next/server";
   
   export async function GET(request: NextRequest) {
     return NextResponse.json({ message: "Hello" });
   }
   ```

2. **Call from Client**

   ```tsx
   const response = await axios.get("/api/my-endpoint");
   ```

### Modifying Theme

1. **Update Colors**

   ```typescript
   // src/theme/colors.ts
   export const colors = {
     // Add/modify colors
   };
   ```

2. **Update Theme**

   ```typescript
   // src/theme/theme.ts
   const theme = extendTheme({
     semanticTokens: {
       colors: {
         // Add semantic tokens
       }
     }
   });
   ```

### Adding Socket.IO Event

1. **Listen in Component**

   ```tsx
   const { socket, isConnected } = useSocket();
   
   useEffect(() => {
     if (isConnected && socket) {
       socket.on("my_event", (data) => {
         // Handle event
       });
       
       return () => {
         socket.off("my_event");
       };
     }
   }, [isConnected, socket]);
   ```

---

## Troubleshooting

### Server Won't Start

**Issue:** Port already in use
- **Solution:** Change port or kill process using port 3000

**Issue:** Missing dependencies
- **Solution:** Run `npm install`

**Issue:** TypeScript errors
- **Solution:** Check `tsconfig.json` and fix type errors

### API Requests Failing

**Issue:** CORS errors
- **Solution:** Verify middleware is proxying correctly

**Issue:** 404 errors
- **Solution:** Check `BACKEND_DESTINATION_HOST` environment variable

**Issue:** Timeout errors
- **Solution:** Check backend is running and accessible

### Socket.IO Not Connecting

**Issue:** Connection fails
- **Solution:**
  - Check `/api/socket/io` route is accessible
  - Verify backend Socket.IO is running
  - Check browser console for errors

**Issue:** Events not received
- **Solution:**
  - Verify event listeners are set up
  - Check Socket.IO connection state
  - Verify backend is emitting events

### Styling Issues

**Issue:** Theme not applying
- **Solution:**
  - Check `ChakraProvider` is wrapping app
  - Verify theme import
  - Check color mode

**Issue:** Responsive design not working
- **Solution:**
  - Check breakpoint usage
  - Verify Chakra UI responsive props
  - Test on different screen sizes

### Build Errors

**Issue:** TypeScript errors
- **Solution:** Fix type errors before building

**Issue:** Module not found
- **Solution:** Check imports, verify file paths

**Issue:** Build fails
- **Solution:** Check build logs, fix errors

---

## Best Practices

1. **Component Organization**
   - One component per file
   - Co-located styles/types
   - Index files for exports

2. **Type Safety**
   - Use TypeScript interfaces
   - Avoid `any` types
   - Use `@pluto/interfaces` for shared types

3. **State Management**
   - Use local state for component-specific data
   - Use context for global state
   - Consider React Query for server state

4. **Performance**
   - Use `useMemo` for expensive calculations
   - Use `useCallback` for event handlers
   - Lazy load heavy components
   - Optimize re-renders

5. **Accessibility**
   - Use semantic HTML
   - Add ARIA labels
   - Keyboard navigation
   - Screen reader support

6. **Error Handling**
   - Try-catch for async operations
   - User-friendly error messages
   - Error boundaries (consider adding)
   - Loading states

7. **Code Quality**
   - Run linter: `npm run lint`
   - Follow TypeScript best practices
   - Consistent code style
   - Meaningful variable names

---

## Next Steps

- Review [Architecture Documentation](./ARCHITECTURE.md) for system design
- Check [Components Documentation](./COMPONENTS.md) for component details
- Read [Pages Documentation](./PAGES.md) for page structure
- Understand [API Integration](./API_INTEGRATION.md) for backend communication

