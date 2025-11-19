# Components Documentation

This document provides detailed documentation for all components in the Pluto Frontend.

## Table of Contents

- [Component Categories](#component-categories)
- [Accordion Components](#accordion-components)
- [Alert Components](#alert-components)
- [Badge Components](#badge-components)
- [Form Components](#form-components)
- [Layout Components](#layout-components)
- [Modal Components](#modal-components)
- [Table Components](#table-components)
- [Icon Components](#icon-components)

---

## Component Categories

### UI Components
- Button, Input, Select, Checkbox, RadioButton
- Badge, Alert, Link
- ProgressBar

### Layout Components
- NavBar, Footer
- Section

### Feature Components
- Accordion (Device, Preset, Settings, Monitoring)
- Table (Device, RegisterDevice)
- Modal (various types)

### Icon Components
- Custom SVG icons
- Footer icons

---

## Accordion Components

### DeviceAccordion

**Location:** `src/components/Accordion/DeviceAccordion.tsx`

**Purpose:** Displays device information in an accordion format.

**Props:**
- `device: Device` - Device object
- Additional props for accordion behavior

**Features:**
- Expandable/collapsible device details
- Device information display
- Action buttons

**Usage:**
```tsx
<DeviceAccordion device={device} />
```

---

### DeviceMonitoringAccordion

**Location:** `src/components/Accordion/DeviceMonitoringAccordion.tsx`

**Purpose:** Displays device monitoring information in accordion format.

**Props:**
- `device: Device` - Device object
- Additional monitoring-specific props

**Features:**
- Real-time metrics display
- Grafana dashboard embedding
- Monitoring controls

---

### DeviceSettingsAccordion

**Location:** `src/components/Accordion/DeviceSettingsAccordion.tsx`

**Purpose:** Displays device settings in accordion format.

**Props:**
- `device: Device` - Device object
- Settings configuration props

**Features:**
- Device configuration editing
- Form inputs
- Save/restart actions

---

### PresetAccordion

**Location:** `src/components/Accordion/PresetAccordion.tsx`

**Purpose:** Displays preset information in accordion format.

**Props:**
- `preset: Preset` - Preset object
- Additional preset-specific props

**Features:**
- Preset configuration display
- Edit/delete actions
- Associated devices list

---

## Alert Components

### Alert

**Location:** `src/components/Alert/Alert.tsx`

**Purpose:** Displays alert/notification messages.

**Props:**
- `status: AlertStatus` - Alert status (success, error, warning, info)
- `title?: string` - Alert title
- `message?: string` - Alert message
- `onClose?: () => void` - Close handler

**Features:**
- Multiple status types
- Auto-dismiss (optional)
- Customizable styling

**Usage:**
```tsx
<Alert status="error" title="Error" message="Something went wrong" />
```

---

## Badge Components

### Badge

**Location:** `src/components/Badge/Badge.tsx`

**Purpose:** Generic badge component.

**Props:**
- `children: ReactNode` - Badge content
- `variant?: string` - Badge variant
- Additional styling props

---

### DeviceStatusBadge

**Location:** `src/components/Badge/DeviceStatusBadge.tsx`

**Purpose:** Displays device online/offline status.

**Props:**
- `isOnline: boolean` - Device online status
- Additional styling props

**Features:**
- Color-coded status (green=online, gray=offline)
- Icon support
- Customizable styling

**Usage:**
```tsx
<DeviceStatusBadge isOnline={device.tracing} />
```

---

### HostnameBadge

**Location:** `src/components/Badge/HostnameBadge.tsx`

**Purpose:** Displays device hostname in badge format.

**Props:**
- `hostname: string` - Device hostname
- Additional styling props

---

## Form Components

### Button

**Location:** `src/components/Button/Button.tsx`

**Purpose:** Custom button component with theme integration.

**Props:**
- `children: ReactNode` - Button content
- `variant?: string` - Button variant
- `onClick?: () => void` - Click handler
- `disabled?: boolean` - Disabled state
- Additional Chakra UI button props

**Variants:**
- Primary
- Outlined
- Text
- Icon

**Usage:**
```tsx
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

---

### Input

**Location:** `src/components/Input/Input.tsx`

**Purpose:** Custom input component.

**Props:**
- Standard HTML input props
- Chakra UI input props
- Theme integration

---

### SearchInput

**Location:** `src/components/Input/SearchInput.tsx`

**Purpose:** Search input with icon.

**Props:**
- `value: string` - Input value
- `onChange: (value: string) => void` - Change handler
- `placeholder?: string` - Placeholder text

**Features:**
- Search icon
- Debouncing (if implemented)
- Clear button

---

### Select

**Location:** `src/components/Select/Select.tsx`

**Purpose:** Custom select dropdown component.

**Props:**
- `options: Array<{label: string, value: any}>` - Select options
- `value: any` - Selected value
- `onChange: (value: any) => void` - Change handler
- Additional Chakra UI select props

---

### Checkbox

**Location:** `src/components/Checkbox/Checkbox.tsx`

**Purpose:** Custom checkbox component.

**Props:**
- Standard checkbox props
- Chakra UI checkbox props
- Theme integration

---

### RadioButton

**Location:** `src/components/RadioButton/RadioButton.tsx`

**Purpose:** Custom radio button component.

**Props:**
- Standard radio button props
- Chakra UI radio props
- Theme integration

---

## Layout Components

### NavBar

**Location:** `src/components/NavBar/NavBar.tsx`

**Purpose:** Main navigation bar.

**Features:**
- Logo
- Navigation links
- Responsive design
- Active route highlighting

**Routes:**
- Overview (/)
- Devices (/devices)
- Monitoring (/monitoring)
- Presets (/presets)
- Settings (/settings)

---

### Footer

**Location:** `src/components/Footer/Footer.tsx`

**Purpose:** Application footer.

**Features:**
- Social media links
- Copyright information
- Footer icons

---

### Section

**Location:** `src/components/Section/`

**Purpose:** Section wrapper components.

**Components:**
- `NoDeviceAddedSection` - Empty state when no devices

---

## Modal Components

### BasicModal

**Location:** `src/components/Modal/BasicModal.tsx`

**Purpose:** Base modal component.

**Props:**
- `isOpen: boolean` - Modal open state
- `onClose: () => void` - Close handler
- `children: ReactNode` - Modal content
- `title?: string` - Modal title
- Additional Chakra UI modal props

**Usage:**
```tsx
<BasicModal isOpen={isOpen} onClose={onClose} title="Modal Title">
  Content here
</BasicModal>
```

---

### RegisterDevicesModal

**Location:** `src/components/Modal/RegisterDevicesModal.tsx`

**Purpose:** Modal for registering/discovering devices.

**Features:**
- Device discovery
- Device selection
- Registration confirmation

---

### AddNewPresetModal

**Location:** `src/components/Modal/AddNewPresetModal.tsx`

**Purpose:** Modal for creating new presets.

**Features:**
- Preset form
- Configuration editor
- Validation

---

### SelectPresetModal

**Location:** `src/components/Modal/SelectPresetModal.tsx`

**Purpose:** Modal for selecting a preset to apply.

**Features:**
- Preset list
- Selection interface
- Apply action

---

### RestartModal

**Location:** `src/components/Modal/RestartModal.tsx`

**Purpose:** Modal for device restart confirmation.

**Features:**
- Restart confirmation
- Warning message
- Confirmation buttons

---

### SaveAndRestartModal

**Location:** `src/components/Modal/SaveAndRestartModal.tsx`

**Purpose:** Modal for saving settings and restarting device.

**Features:**
- Save confirmation
- Restart confirmation
- Combined action

---

## Table Components

### DeviceTable

**Location:** `src/components/Table/DeviceTable.tsx`

**Purpose:** Table displaying device list.

**Props:**
- `devices: Device[]` - Array of devices
- `onDeviceClick?: (device: Device) => void` - Click handler
- Additional table props

**Features:**
- Sortable columns
- Device status indicators
- Action buttons
- Responsive design

**Columns:**
- Hostname
- IP Address
- Status
- Hash Rate
- Power
- Temperature
- Actions

---

### RegisterDeviceTable

**Location:** `src/components/Table/RegisterDeviceTable.tsx`

**Purpose:** Table for device registration/discovery.

**Props:**
- `devices: Device[]` - Discovered devices
- `onRegister: (devices: Device[]) => void` - Register handler
- Additional table props

**Features:**
- Device selection (checkboxes)
- Bulk registration
- Device information display

---

## Icon Components

### Custom Icons

**Location:** `src/components/icons/`

**Purpose:** Custom SVG icon components.

**Icons:**
- AddIcon
- ArrowIcon (various directions)
- CloseIcon
- CogIcon
- CrossIcon
- DeleteIcon
- DiscordLogo
- DuplicateIcon
- ErrorIcon
- HamburgerIcon
- HomeIcon
- InfoIcon
- LoadoutLogo
- Logo
- LogsIcon
- PauseIcon
- PlutoLogo
- RestartIcon
- SearchIcon
- SettingsIcon
- ShowIcon
- SignalIcon
- SuccessIcon
- WarningIcon

**Usage:**
```tsx
import { AddIcon } from "@/components/icons/AddIcon";

<AddIcon />
```

---

## Feature Components

### PresetEditor

**Location:** `src/components/PresetEditor/PresetEditor.tsx`

**Purpose:** Editor for preset configuration.

**Props:**
- `preset?: Preset` - Preset to edit (optional for new)
- `onSave: (preset: Preset) => void` - Save handler
- `onCancel?: () => void` - Cancel handler

**Features:**
- Form fields for preset configuration
- Validation
- Save/cancel actions

---

### CircularProgressWithDots

**Location:** `src/components/ProgressBar/CircularProgressWithDots.tsx`

**Purpose:** Circular progress indicator with animated dots.

**Props:**
- `size?: number` - Progress size
- `color?: string` - Progress color
- Additional styling props

**Features:**
- Animated dots
- Customizable size and color

---

## Component Patterns

### Composition Pattern
Components are composed from smaller components:
```tsx
<Modal>
  <ModalHeader />
  <ModalBody>
    <Form>
      <Input />
      <Select />
    </Form>
  </ModalBody>
  <ModalFooter>
    <Button />
  </ModalFooter>
</Modal>
```

### Props Pattern
- TypeScript interfaces for props
- Optional props with defaults
- Chakra UI props spreading

### Styling Pattern
- Chakra UI props for styling
- Theme integration
- Responsive props
- Semantic color tokens

## Best Practices

1. **Component Organization**
   - One component per file
   - Index file for exports
   - Co-located styles/types

2. **Type Safety**
   - TypeScript interfaces for props
   - Use `@pluto/interfaces` for shared types
   - Avoid `any` types

3. **Reusability**
   - Generic components where possible
   - Props for customization
   - Composition over configuration

4. **Performance**
   - Memoization for expensive components
   - Lazy loading for heavy components
   - Optimize re-renders

5. **Accessibility**
   - Semantic HTML
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

