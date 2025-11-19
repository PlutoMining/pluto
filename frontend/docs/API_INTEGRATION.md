# API Integration Documentation

This document describes how the frontend integrates with backend APIs and Socket.IO.

## Table of Contents

- [API Proxying](#api-proxying)
- [REST API Integration](#rest-api-integration)
- [Socket.IO Integration](#socketio-integration)
- [Grafana Integration](#grafana-integration)
- [Error Handling](#error-handling)

---

## API Proxying

### Middleware Configuration

**File:** `src/middleware.ts`

The Next.js middleware intercepts requests and proxies them to appropriate services.

### Backend API Proxying

**Pattern:** `/api/*` → `{BACKEND_DESTINATION_HOST}/*`

**Flow:**
```
Client Request: /api/devices/imprint
    ↓
Middleware Intercepts
    ↓
Strips /api prefix
    ↓
Rewrites to: {BACKEND_DESTINATION_HOST}/devices/imprint
    ↓
Backend Response
    ↓
Returns to Client
```

**Implementation:**
```typescript
if (url.pathname.startsWith("/api")) {
  const isInternalRoute = internalApiRoutes.some(
    (route) => url.pathname.startsWith(route)
  );
  
  if (!isInternalRoute) {
    const backendHost = process.env.BACKEND_DESTINATION_HOST;
    const strippedPath = url.pathname.replace("/api", "");
    const apiUrl = new URL(`${backendHost}${strippedPath}${url.search}`);
    return NextResponse.rewrite(apiUrl);
  }
}
```

**Internal Routes** (not proxied):
- `/api/app-version` - Handled by Next.js route
- `/api/socket/io` - Handled by Socket.IO route

---

### Grafana Proxying

**Pattern:** `/grafana/*` → `{GF_HOST}/grafana/*`

**Flow:**
```
Client Request: /grafana/public-dashboards/...
    ↓
Middleware Intercepts
    ↓
Rewrites to: {GF_HOST}/grafana/public-dashboards/...
    ↓
Adds Headers:
    - X-WEBAUTH-USER: admin
    - X-Frame-Options: ALLOWALL
    - Content-Security-Policy: frame-ancestors 'self' *;
    ↓
Grafana Response
    ↓
Returns to Client
```

**Headers Added:**
- `X-WEBAUTH-USER: admin` - Grafana authentication (except public dashboards)
- `X-Frame-Options: ALLOWALL` - Allow iframe embedding
- `Content-Security-Policy: frame-ancestors 'self' *;` - Allow iframe from any origin
- `Origin: {GF_HOST}` - For API requests

---

## REST API Integration

### HTTP Client

**Library:** Axios 1.7+

**Base URL:** `/api/*` (proxied to backend)

### API Endpoints Used

#### Devices

**GET /api/devices/imprint**
- Fetches all registered devices
- Returns: `{ message: string, data: Device[] }`

**GET /api/devices/imprint/:id**
- Fetches single device
- Returns: `{ message: string, data: Device }`

**PUT /api/devices/imprint**
- Registers devices
- Body: `{ macs: string[] }`
- Returns: `{ message: string, data: Device[] }`

**PATCH /api/devices/imprint/:id**
- Updates device
- Body: `{ device: Device }`
- Returns: `{ message: string, data: Device }`

**DELETE /api/devices/imprint/:id**
- Deletes device
- Returns: `{ message: string, data: Device }`

**PUT /api/devices/listen**
- Starts monitoring devices
- Body: `{ macs: string[], traceLogs?: boolean }`
- Returns: `{ message: string, data: Device[] }`

**POST /api/devices/:id/system/restart**
- Restarts device
- Returns: `{ message: string, data: any }`

**PATCH /api/devices/:id/system**
- Updates device system info
- Body: `DeviceInfo` (partial)
- Returns: `{ message: string, data: Device }`

#### Discovery

**GET /api/devices/discover**
- Discovers devices
- Query: `?ip=...&mac=...`
- Returns: `Device[]`

**GET /api/devices/discovered**
- Looks up discovered devices
- Query: `?macs=...&ips=...&hostnames=...`
- Returns: `Device[]`

#### Presets

**GET /api/presets**
- Fetches all presets
- Returns: `{ message: string, data: Preset[] }`

**GET /api/presets/:id**
- Fetches single preset
- Returns: `{ message: string, data: Preset }`

**POST /api/presets**
- Creates preset
- Body: `Preset`
- Returns: `{ message: string, data: Preset }`

**DELETE /api/presets/:id**
- Deletes preset
- Returns: `{ message: string, data: Preset }`

#### Dashboards

**GET /api/dashboards**
- Fetches all Grafana dashboards
- Returns: `Dashboard[]`

### Usage Examples

**Fetch Devices:**
```typescript
const response = await axios.get("/api/devices/imprint");
const devices: Device[] = response.data.data;
```

**Register Devices:**
```typescript
const response = await axios.put("/api/devices/imprint", {
  macs: ["aa:bb:cc:dd:ee:ff"]
});
```

**Update Device:**
```typescript
const response = await axios.patch(`/api/devices/imprint/${device.mac}`, {
  device: updatedDevice
});
```

**Delete Device:**
```typescript
const response = await axios.delete(`/api/devices/imprint/${device.mac}`);
```

---

## Socket.IO Integration

### Architecture

**Client → Next.js Proxy → Backend**

```
Browser Socket.IO Client
    ↓
Next.js Socket.IO Server (/api/socket/io)
    ↓
Backend Socket.IO Server
```

### Client Setup

**Provider:** `SocketProvider` (`src/providers/SocketProvider.tsx`)

**Connection:**
```typescript
const socketInstance = ClientIO("/", {
  path: "/api/socket/io",
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

**Connection Flow:**
1. Fetches devices first
2. Creates Socket.IO connection
3. Connects to Next.js proxy
4. Proxy forwards to backend

### Server Proxy Setup

**File:** `src/pages/api/socket/io.ts`

**Implementation:**
1. Creates Socket.IO server (singleton)
2. For each client connection:
   - Connects to backend Socket.IO
   - Forwards events bidirectionally

**Events Forwarded:**
- `stat_update` - Device status updates
- `device_removed` - Device removed
- `error` - Error events

### Client Events

**Listening to Events:**
```typescript
const { socket, isConnected } = useSocket();

useEffect(() => {
  if (isConnected && socket) {
    const listener = (device: Device) => {
      // Handle device update
    };
    
    socket.on("stat_update", listener);
    
    return () => {
      socket.off("stat_update", listener);
    };
  }
}, [isConnected, socket]);
```

**Available Events:**
- `stat_update` - Device status update (every 5 seconds per device)
- `device_removed` - Device removed from monitoring
- `error` - Device error occurred
- `logs_update` - Device log message (if log streaming enabled)

**Sending Events:**
```typescript
socket.emit("enableLogsListening");
socket.emit("disableLogsListening");
socket.emit("checkLogsListening");
```

### Connection State

**State Management:**
- `isConnected: boolean` - Connection status
- `socket: Socket | null` - Socket instance
- `devices: Device[] | null` - Device list

**Connection Lifecycle:**
1. **Initial**: Fetches devices
2. **Connecting**: Creates socket connection
3. **Connected**: `isConnected = true`
4. **Disconnected**: `isConnected = false`, auto-reconnect
5. **Error**: Logs error, attempts reconnection

---

## Grafana Integration

### Dashboard Embedding

**Pattern:** Embed Grafana public dashboards in iframes.

**Implementation:**
```tsx
<iframe
  src={`${dashboardPublicUrl}&theme=${colorMode}&refresh=5s`}
  style={{ width: "100%", height: "100%", border: "none" }}
/>
```

**URL Parameters:**
- `theme` - Light/dark mode
- `refresh` - Auto-refresh interval

### Iframe Styling

**File:** `src/utils/iframe.ts`

**Function:** `restyleIframe()`

**Purpose:** Customizes Grafana dashboard appearance to match frontend theme.

**Styling Applied:**
- Custom fonts (Clash Display, Azeret Mono)
- Background color matching theme
- Text color matching theme
- Hides Grafana UI elements (toolbar, footer)
- Responsive adjustments

**Usage:**
```tsx
<iframe
  onLoad={restyleIframe(iframeRef, bgColor, textColor, graphBgColor)}
  ref={iframeRef}
  src={dashboardUrl}
/>
```

### Dashboard URLs

**Format:** `/grafana/public-dashboards/{accessToken}?orgId=1&theme={mode}&refresh=5s`

**Source:**
- Fetched from `/api/dashboards`
- Each dashboard has `publicUrl` property
- Overview dashboard: `name === "overview"`
- Device dashboards: `name === device.hostname`

---

## Error Handling

### API Error Handling

**Pattern:**
```typescript
try {
  const response = await axios.get("/api/endpoint");
  // Handle success
} catch (error) {
  if (axios.isAxiosError(error)) {
    // Handle Axios error
    console.error("API Error:", error.response?.data);
    setAlert({
      status: "error",
      title: "Error",
      message: error.response?.data?.error || "Request failed"
    });
  } else {
    // Handle other errors
    console.error("Unexpected error:", error);
  }
}
```

### Socket.IO Error Handling

**Connection Errors:**
```typescript
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  // Show connection error message
});
```

**Event Errors:**
```typescript
socket.on("error", (data) => {
  // Handle device error
  setAlert({
    status: "error",
    message: `Device error: ${data.error}`
  });
});
```

### Network Error Handling

**Timeout Handling:**
- Axios default timeout
- Consider adding custom timeout
- Show timeout message to user

**Retry Logic:**
- Socket.IO has built-in reconnection
- API calls: Consider adding retry logic
- Exponential backoff for retries

---

## Best Practices

1. **API Calls**
   - Use try-catch for error handling
   - Show user-friendly error messages
   - Handle loading states
   - Validate responses

2. **Socket.IO**
   - Clean up event listeners
   - Handle connection state
   - Reconnect on disconnect
   - Handle errors gracefully

3. **Error Messages**
   - User-friendly messages
   - Technical details in console
   - Alert component for notifications
   - Clear error states

4. **Loading States**
   - Show loading indicators
   - Disable actions during loading
   - Handle empty states
   - Optimistic updates where appropriate

5. **Data Synchronization**
   - Real-time updates via Socket.IO
   - Manual refresh option
   - Conflict resolution
   - State consistency

---

## Environment Variables

**Required:**
- `BACKEND_DESTINATION_HOST` - Backend service URL
- `GF_HOST` - Grafana host URL

**Usage:**
- Middleware uses for proxying
- Socket.IO proxy uses for backend connection
- Not exposed to client (server-side only)

---

## Security Considerations

1. **API Proxying**: Prevents CORS issues, hides backend URL
2. **No Client Secrets**: Environment variables server-side only
3. **Socket.IO**: Secure connection (consider WSS in production)
4. **Input Validation**: Validate user input before API calls
5. **Error Messages**: Don't expose sensitive information

