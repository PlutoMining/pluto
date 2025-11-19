# Pages Documentation

This document provides detailed documentation for all pages in the Pluto Frontend.

## Table of Contents

- [Overview Page](#overview-page)
- [Devices Page](#devices-page)
- [Monitoring Pages](#monitoring-pages)
- [Presets Page](#presets-page)
- [Device Settings Page](#device-settings-page)
- [Settings Page](#settings-page)
- [API Routes](#api-routes)

---

## Overview Page

**Route:** `/`  
**File:** `src/app/page.tsx`  
**Type:** Client Component

### Purpose
Displays the overview dashboard with aggregated metrics from all devices.

### Features
- Grafana overview dashboard embedding
- Device count display
- Empty state when no devices
- Responsive iframe sizing

### Data Flow
1. Fetches devices: `GET /api/devices/imprint`
2. Fetches dashboards: `GET /api/dashboards`
3. Finds overview dashboard
4. Embeds Grafana dashboard in iframe

### Components Used
- `NoDeviceAddedSection` - Empty state
- Custom iframe with styling

### State Management
- `devices: Device[]` - Device list
- `dashboardPublicUrl: string` - Overview dashboard URL

### Example
```tsx
// Fetches devices and dashboards on mount
useEffect(() => {
  fetchDevicesAndDashboardsAndUpdate();
  fetchDevices();
}, []);
```

---

## Devices Page

**Route:** `/devices`  
**File:** `src/app/devices/page.tsx`  
**Type:** Client Component

### Purpose
Manages device registration, listing, and deletion.

### Features
- Device list with real-time updates
- Device registration modal
- Device deletion with confirmation
- Real-time status updates via Socket.IO
- Device table display

### Data Flow
1. Fetches registered devices: `GET /api/devices/imprint`
2. Listens to Socket.IO events:
   - `stat_update` - Device status updates
   - `error` - Device errors
3. Updates device list in real-time

### Components Used
- `DeviceTable` - Device list table
- `RegisterDevicesModal` - Device registration
- `BasicModal` - Confirmation modals
- `Alert` - Success/error notifications
- `Button` - Action buttons

### State Management
- `registeredDevices: Device[]` - Device list
- `alert: AlertInterface` - Alert state
- Modal open/close states

### Actions
- **Register Devices**: Opens modal, discovers devices, registers selected
- **Delete Device**: Confirms deletion, calls API, updates list
- **View Device**: Navigate to monitoring page

### Socket.IO Integration
```tsx
socket.on("stat_update", (device: Device) => {
  // Update device in list
});

socket.on("error", (device: Device) => {
  // Handle device error
});
```

---

## Monitoring Pages

### Monitoring List Page

**Route:** `/monitoring`  
**File:** `src/app/monitoring/page.tsx`  
**Type:** Client Component

### Purpose
Lists all devices with monitoring links.

### Features
- Device list with monitoring links
- Quick access to device dashboards
- Device status indicators

---

### Individual Device Monitoring Page

**Route:** `/monitoring/[id]`  
**File:** `src/app/monitoring/[id]/page.tsx`  
**Type:** Client Component

### Purpose
Displays detailed monitoring for a specific device.

### Features
- Device-specific Grafana dashboard
- Real-time device metrics
- Device information display
- Log streaming (if enabled)

### Data Flow
1. Gets device ID from route params
2. Fetches device: `GET /api/devices/imprint/:id`
3. Fetches device dashboard: `GET /api/dashboards`
4. Embeds Grafana dashboard
5. Listens to Socket.IO for real-time updates

### Components Used
- `DeviceMonitoringAccordion` - Device monitoring accordion
- Grafana iframe
- Real-time metrics display

### State Management
- `device: Device` - Current device
- `dashboardUrl: string` - Device dashboard URL
- Real-time metrics state

---

## Presets Page

**Route:** `/presets`  
**File:** `src/app/presets/page.tsx`  
**Type:** Client Component

### Purpose
Manages device configuration presets.

### Features
- Preset list display
- Create new preset
- Edit existing preset
- Delete preset
- Apply preset to devices

### Data Flow
1. Fetches presets: `GET /api/presets`
2. Fetches devices: `GET /api/devices/imprint`
3. Updates preset list on changes

### Components Used
- `PresetAccordion` - Preset display
- `AddNewPresetModal` - Create preset
- `PresetEditor` - Preset editing
- `SelectPresetModal` - Apply preset

### State Management
- `presets: Preset[]` - Preset list
- `devices: Device[]` - Device list (for association)
- Modal states

### Actions
- **Create Preset**: Opens modal, creates preset via API
- **Edit Preset**: Opens editor, updates preset
- **Delete Preset**: Confirms deletion, removes preset
- **Apply Preset**: Selects devices, applies preset

---

## Device Settings Page

**Route:** `/device-settings`  
**File:** `src/app/device-settings/page.tsx`  
**Type:** Client Component

### Purpose
Allows editing device settings and configuration.

### Features
- Device selection
- Settings form
- Configuration editing
- Save and restart functionality
- Real-time validation

### Data Flow
1. Fetches devices: `GET /api/devices/imprint`
2. Loads device configuration
3. Updates device: `PATCH /api/devices/:id/system`
4. Restarts device: `POST /api/devices/:id/system/restart`

### Components Used
- `DeviceSettingsAccordion` - Settings accordion
- Form inputs (Input, Select, Checkbox, RadioButton)
- `SaveAndRestartModal` - Save confirmation
- `RestartModal` - Restart confirmation

### State Management
- `devices: Device[]` - Device list
- `selectedDevice: Device` - Currently editing device
- `formData: Partial<DeviceInfo>` - Form state
- Validation state

### Actions
- **Select Device**: Loads device configuration
- **Update Settings**: Updates form state
- **Save Settings**: Validates and saves to device
- **Restart Device**: Confirms and restarts device

---

## Settings Page

**Route:** `/settings`  
**File:** `src/app/settings/page.tsx`  
**Type:** Client Component

### Purpose
Application settings and configuration.

### Features
- Application preferences
- Theme settings (handled by Chakra)
- Connection settings
- Log streaming controls

### Components Used
- Settings form components
- Toggle switches
- Input fields

---

## API Routes

### App Version Route

**Route:** `/api/app-version`  
**File:** `src/app/api/app-version/route.ts`  
**Type:** Server Route Handler

### Purpose
Returns application version information.

### Implementation
- Reads `/tmp/umbrel-app.yml`
- Parses YAML
- Returns version data

### Response
```json
{
  "version": "1.1",
  ...
}
```

---

### Socket.IO Route

**Route:** `/api/socket/io`  
**File:** `src/pages/api/socket/io.ts`  
**Type:** API Route Handler

### Purpose
Sets up Socket.IO server and proxies to backend.

### Implementation
1. Creates Socket.IO server if not exists
2. Connects to backend Socket.IO
3. Forwards events:
   - `stat_update` - Device status updates
   - `device_removed` - Device removal
   - `error` - Errors

### Flow
```
Client Socket.IO → Next.js Socket.IO Server → Backend Socket.IO
```

### Events Forwarded
- `stat_update` - Device status updates
- `device_removed` - Device removed
- `error` - Error events

---

## Page Patterns

### Data Fetching Pattern
```tsx
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await axios.get("/api/endpoint");
      setData(response.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };
  fetchData();
}, []);
```

### Real-Time Update Pattern
```tsx
useEffect(() => {
  if (isConnected && socket) {
    const listener = (data: Device) => {
      // Update state
    };
    socket.on("stat_update", listener);
    return () => {
      socket.off("stat_update", listener);
    };
  }
}, [isConnected, socket]);
```

### Modal Pattern
```tsx
const { isOpen, onOpen, onClose } = useDisclosure();

<BasicModal isOpen={isOpen} onClose={onClose}>
  Content
</BasicModal>
```

### Form Pattern
```tsx
const [formData, setFormData] = useState<Partial<DeviceInfo>>({});

const handleSubmit = async () => {
  try {
    await axios.patch(`/api/devices/${id}/system`, formData);
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

---

## Navigation

### Routes
- `/` - Overview
- `/devices` - Device management
- `/monitoring` - Monitoring list
- `/monitoring/[id]` - Device monitoring
- `/presets` - Preset management
- `/device-settings` - Device settings
- `/settings` - Application settings

### Navigation Component
- `NavBar` component handles navigation
- Active route highlighting
- Responsive menu (mobile)

---

## Error Handling

### API Errors
```tsx
try {
  const response = await axios.get("/api/endpoint");
} catch (error) {
  setAlert({
    status: "error",
    title: "Error",
    message: "Failed to fetch data"
  });
}
```

### Socket Errors
```tsx
socket.on("error", (data) => {
  // Handle error
  setAlert({
    status: "error",
    message: "Device error occurred"
  });
});
```

---

## Best Practices

1. **Data Fetching**
   - Fetch on mount with `useEffect`
   - Handle loading states
   - Handle error states

2. **Real-Time Updates**
   - Clean up event listeners
   - Update state immutably
   - Handle connection state

3. **Form Handling**
   - Controlled inputs
   - Validation
   - Error display

4. **Modal Management**
   - Use `useDisclosure` hook
   - Clean up on unmount
   - Handle modal state

5. **Routing**
   - Use Next.js Link for navigation
   - Handle dynamic routes
   - Handle route params

