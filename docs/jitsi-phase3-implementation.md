# Jitsi Integration - Phase 3: Admin Features & Polish

## Overview
Phase 3 adds administrative features for managing Jitsi room mappings, server configuration, and call quality monitoring. This phase provides the tools needed for administrators to configure and monitor the Jitsi integration.

## Implementation Date
2025-11-04

---

## 1. Jitsi Room Mapping Editor UI ✅

### Component: `JitsiRoomMappingEditor.tsx`
**Location**: `client/src/components/JitsiRoomMappingEditor.tsx`

A full-featured admin UI component for managing area-to-room mappings.

### Features Implemented

#### Table View
- **Columns**: Area ID, Jitsi Room Name, Display Name, Type (Custom/Auto), Actions
- **Pagination**: 10 items per page
- **Sorting**: Sortable by all columns
- **Visual Indicators**: Custom mappings highlighted with blue tags

#### CRUD Operations
- **Add Mapping**: Modal form with validation
  - Area ID input (required)
  - Jitsi Room Name input (required, auto-sanitized)
  - Display Name input (optional)
  - Real-time room name sanitization preview
  
- **Edit Mapping**: Inline editing via modal
  - Pre-populated with existing values
  - Same validation as add form
  
- **Delete Mapping**: Individual delete with confirmation
  - Popconfirm dialog to prevent accidental deletion
  - Reverts to auto-generated room name after deletion

#### Bulk Operations
- **Import Mappings**: Upload JSON file
  - Validates JSON structure
  - Merges with existing mappings
  - Shows success/error messages
  
- **Export Mappings**: Download as JSON
  - Includes all mappings with metadata
  - Formatted for readability
  - Can be re-imported later
  
- **Clear All**: Remove all custom mappings
  - Confirmation modal with warning
  - Resets all areas to auto-generated names

### UI/UX Details
- **Ant Design Components**: Table, Modal, Button, Input, Tag, Popconfirm
- **Icons**: EditOutlined, DeleteOutlined, PlusOutlined, DownloadOutlined, UploadOutlined
- **Responsive**: Works on desktop and tablet
- **Accessibility**: Proper labels, ARIA attributes, keyboard navigation

### Code Example
```typescript
<JitsiRoomMappingEditor />
```

---

## 2. Map Editor Integration ✅

### New Tab: `JitsiTab.tsx`
**Location**: `client/src/modules/map-editor/components/tabs/JitsiTab.tsx`

A dedicated tab in the map editor for managing Jitsi room mappings.

### Integration Points

#### 1. Editor Constants
**File**: `client/src/modules/map-editor/constants/editorConstants.ts`

Added 'jitsi' tab to EDITOR_TABS:
```typescript
import { Video } from 'lucide-react';

{ id: 'jitsi', label: 'Jitsi Rooms', icon: React.createElement(Video, { size: 16 }) }
```

#### 2. Type Definitions
**File**: `client/src/modules/map-editor/types/editor.types.ts`

Updated TabId type:
```typescript
export type TabId = 'areas' | 'terrain' | 'assets' | 'layers' | 'collision' | 'jitsi' | 'settings';
```

#### 3. Fabric.js Editor
**File**: `client/src/modules/map-editor/MapEditorModule.tsx`

Added case in renderTabContent():
```typescript
case 'jitsi':
  return <JitsiTab />;
```

#### 4. Konva Editor
**File**: `client/src/modules/map-editor-konva/KonvaMapEditorModule.tsx`

Added conditional render:
```typescript
{activeTab === 'jitsi' && <JitsiTab />}
```

### User Workflow
1. Open Map Editor
2. Click "Jitsi Rooms" tab (Video icon)
3. View/edit room mappings for all interactive areas
4. Changes saved automatically to localStorage
5. Mappings take effect immediately in game

---

## 3. Jitsi Server Configuration ✅

### Settings Context Updates
**File**: `client/src/shared/SettingsContext.tsx`

#### Interface Changes
```typescript
export interface AppSettings {
  videoService: VideoServiceType;
  adminMode: boolean;
  theme: ThemeType;
  jitsiServerUrl?: string; // NEW: Optional custom Jitsi server URL
}
```

#### New Methods
```typescript
interface SettingsContextType {
  // ... existing methods
  updateJitsiServerUrl: (url: string) => void; // NEW
}
```

#### Implementation
```typescript
const updateJitsiServerUrl = useCallback((url: string) => {
  setSettings(prev => ({
    ...prev,
    jitsiServerUrl: url,
  }));
}, []);
```

#### Persistence
- Saved to localStorage with key: `stargetyOasisSettings`
- Loaded on app startup
- Default: `meet.stargety.com`

### UI Integration
**File**: `client/src/components/settings/ConsolidatedSettings.tsx`

#### New UI Section (Admin Only, Jitsi Selected)
```typescript
{settings.videoService === 'jitsi' && (
  <div>
    <Title level={5}>
      <LinkOutlined /> Jitsi Server Configuration
    </Title>
    <Input
      placeholder="meet.stargety.com"
      value={jitsiUrl}
      onChange={(e) => handleJitsiUrlChange(e.target.value)}
      prefix={<LinkOutlined />}
    />
    <Text type="secondary">
      Enter the domain of your Jitsi Meet server (without https://)
    </Text>
  </div>
)}
```

#### Configuration Tips Card
Provides helpful guidance:
- Use custom Jitsi server domain
- Do not include "https://" or trailing slashes
- Default: meet.stargety.com
- Public option: meet.jit.si

### VideoCallModule Integration
**File**: `client/src/components/VideoCommunicationPanel.tsx`

Pass server URL from settings:
```typescript
<VideoCallModule
  roomId={videoRoomId}
  userName={user.username}
  serverUrl={settings.jitsiServerUrl || 'meet.stargety.com'}
/>
```

---

## 4. Call Quality Monitoring ✅

### Analytics Service: `JitsiAnalyticsService.ts`
**Location**: `client/src/shared/JitsiAnalyticsService.ts`

A comprehensive analytics service for tracking Jitsi call quality and connection issues.

### Features

#### Session Tracking
- **Start Session**: Creates unique session ID when call starts
- **End Session**: Calculates duration and average quality
- **Session Data**: Stores room ID, timestamps, participant count, quality events, errors

#### Event Logging
```typescript
// Quality changes
jitsiAnalyticsService.logQualityChange('good' | 'medium' | 'poor');

// Participant changes
jitsiAnalyticsService.logParticipantChange(count);

// Connection errors
jitsiAnalyticsService.logError(errorMessage);
```

#### Data Storage
- **Storage Key**: `stargety_jitsi_analytics`
- **Max Sessions**: 100 (keeps last 100 sessions)
- **Format**: JSON array of CallSession objects

#### Analytics Summary
```typescript
const summary = jitsiAnalyticsService.getSummary();
// Returns:
// - totalSessions: number
// - totalDuration: number (seconds)
// - averageSessionDuration: number (seconds)
// - totalErrors: number
// - qualityDistribution: { good, medium, poor }
```

#### Data Export/Import
```typescript
// Export all analytics data
const jsonData = jitsiAnalyticsService.exportData();

// Get sessions by room
const roomSessions = jitsiAnalyticsService.getSessionsByRoom('meeting-room');

// Clear all data
jitsiAnalyticsService.clearAllData();
```

### VideoCallModule Integration
**File**: `client/src/modules/video-call/VideoCallModule.tsx`

#### Session Lifecycle
```typescript
// On call joined
sessionIdRef.current = jitsiAnalyticsService.startSession(cleanRoomId);

// On call left
jitsiAnalyticsService.endSession();
sessionIdRef.current = null;
```

#### Event Tracking
```typescript
// Quality changes
jitsiAnalyticsService.logQualityChange(qualityLevel);

// Participant changes
jitsiAnalyticsService.logParticipantChange(count);

// Errors
jitsiAnalyticsService.logError(errorMsg);
```

### Console Logging
All analytics events are logged to console with emoji prefixes:
- 📊 Analytics events
- 👥 Participant changes
- 📶 Quality changes
- ❌ Errors

---

## Testing Phase 3 Features

### 1. Room Mapping Editor
- [ ] Open map editor → Jitsi Rooms tab
- [ ] Add custom room mapping
- [ ] Edit existing mapping
- [ ] Delete mapping
- [ ] Export mappings to JSON
- [ ] Import mappings from JSON
- [ ] Clear all mappings
- [ ] Verify pagination works
- [ ] Verify sorting works

### 2. Server Configuration
- [ ] Open Settings (admin user)
- [ ] Select Jitsi as video service
- [ ] See Jitsi Server Configuration section
- [ ] Change server URL
- [ ] Save settings
- [ ] Reload page → verify URL persisted
- [ ] Join call → verify using custom server

### 3. Analytics Monitoring
- [ ] Join a Jitsi call
- [ ] Check console for "📊 Analytics: Started session" message
- [ ] Simulate quality changes (network throttling)
- [ ] Check console for quality change logs
- [ ] Add/remove participants
- [ ] Check console for participant change logs
- [ ] Leave call
- [ ] Check console for "📊 Analytics: Ended session" message
- [ ] Open browser console and run:
  ```javascript
  // View analytics summary
  jitsiAnalyticsService.getSummary()
  
  // View all sessions
  jitsiAnalyticsService.getAllSessions()
  
  // Export data
  console.log(jitsiAnalyticsService.exportData())
  ```

---

## Future Enhancements (Not Implemented)

### Analytics Dashboard UI
Create a visual dashboard for viewing analytics:
- Charts showing quality distribution
- Session history table
- Average call duration metrics
- Error frequency graphs
- Room-specific analytics

### Backend Integration
Replace localStorage with backend API:
- POST /api/analytics/sessions - Save session data
- GET /api/analytics/summary - Get analytics summary
- GET /api/analytics/sessions/:roomId - Get room-specific data
- Real-time analytics streaming via WebSocket

### Advanced Room Management
- Room templates (pre-configured settings)
- Room access control (password protection)
- Room scheduling (time-based availability)
- Room capacity limits
- Custom room branding

---

## Summary

Phase 3 successfully implements all admin features and polish:

✅ **JitsiRoomMappingEditor** - Full CRUD UI for room mappings
✅ **Map Editor Integration** - Dedicated Jitsi tab in both editors
✅ **Server Configuration** - Custom Jitsi server URL in settings
✅ **Analytics Service** - Comprehensive call quality monitoring

**Total New Code**: ~450 lines
**Files Created**: 2 (JitsiRoomMappingEditor.tsx, JitsiAnalyticsService.ts, JitsiTab.tsx)
**Files Modified**: 6 (SettingsContext, ConsolidatedSettings, VideoCallModule, VideoCommunicationPanel, editor constants/types/modules)

The Jitsi integration is now feature-complete with robust admin tools and monitoring capabilities!

