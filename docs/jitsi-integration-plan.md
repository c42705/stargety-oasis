# Jitsi Video Conferencing Integration - Implementation Plan

## Overview

This document outlines the implementation plan for integrating Jitsi Meet video conferencing with the Phaser.js map editor, enabling automatic join/leave functionality based on interactive area entry/exit.

## Context

- **Jitsi Server**: meet.stargety.com (already installed and running)
- **Interactive Areas**: Already defined on the map with collision detection
- **Video Panel**: VideoCommunicationPanel component already exists
- **Event System**: EventBusContext provides pub/sub communication

## Architecture

### Current State
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│  WorldModule    │────────▶│   EventBus       │────────▶│ VideoCommunication  │
│  (Phaser.js)    │         │                  │         │      Panel          │
│                 │         │  area-selected   │         │                     │
│  - Player       │         │                  │         │  - Manual Join      │
│  - Collision    │         │                  │         │  - Jitsi Embed      │
│  - Areas        │         │                  │         │                     │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
```

### Target State
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│  WorldModule    │────────▶│   EventBus       │────────▶│ VideoCommunication  │
│  (Phaser.js)    │         │                  │         │      Panel          │
│                 │         │  area-entered    │         │                     │
│  - Player       │         │  area-exited     │         │  - Auto Join        │
│  - Collision    │         │                  │         │  - Auto Leave       │
│  - Areas        │         │                  │         │  - Jitsi Embed      │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
         │                           │                             │
         │                           │                             │
         └───────────────────────────┴─────────────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │ JitsiRoomMapping    │
                          │     Service         │
                          │                     │
                          │  - Area → Room      │
                          │  - localStorage     │
                          │  - TODO: Database   │
                          └─────────────────────┘
```

## Implementation Phases

### Phase 1: Core Functionality (Priority: HIGH)
**Goal**: Basic auto-join/leave working

1. **Create JitsiRoomMappingService** (~150 lines)
   - File: `client/src/shared/JitsiRoomMappingService.ts`
   - Manages area ID → Jitsi room name mappings
   - Uses localStorage (TODO: migrate to database)
   - Provides sanitization for room names

2. **Add Event Types** (~10 lines)
   - File: `client/src/shared/EventBusContext.tsx`
   - Add `area-entered` and `area-exited` to EventMap

3. **Modify WorldModule** (~50 lines)
   - File: `client/src/modules/world/WorldModule.tsx`
   - Update `checkAreaCollisions()` method
   - Track `previousArea` state
   - Emit `area-entered` when entering new area
   - Emit `area-exited` when leaving area

4. **Update VideoCallModule** (~30 lines)
   - File: `client/src/modules/video-call/VideoCallModule.tsx`
   - Change default server URL to `meet.stargety.com`
   - Add enhanced event listeners (optional)

5. **Update VideoCommunicationPanel** (~100 lines)
   - File: `client/src/components/VideoCommunicationPanel.tsx`
   - Subscribe to `area-entered` and `area-exited` events
   - Auto-connect when entering area
   - Auto-disconnect when leaving area
   - Use JitsiRoomMappingService for room names

### Phase 2: Edge Cases & Error Handling (Priority: MEDIUM)
**Goal**: Robust, production-ready implementation

1. **Debouncing** (~30 lines)
   - Handle rapid area transitions
   - 500ms delay before switching rooms

2. **Retry Logic** (~40 lines)
   - Exponential backoff for connection failures
   - Max 3 retries with 1s, 2s, 4s delays

3. **Sticky Mode** (~50 lines)
   - Option to continue call after leaving area
   - Confirmation modal before disconnecting

4. **Enhanced Event Listeners** (~30 lines)
   - Participant count tracking
   - Connection quality monitoring
   - Error handling

5. **Loading States** (~20 lines)
   - Transition indicators
   - User-friendly error messages

### Phase 3: Admin Features (Priority: LOW)
**Goal**: Administrative control and monitoring

1. **JitsiRoomMappingEditor Component** (~200 lines)
   - File: `client/src/components/JitsiRoomMappingEditor.tsx`
   - UI for editing area-to-room mappings
   - Admin-only access

2. **Map Editor Integration** (~50 lines)
   - Add room mapping field to AreaFormModal
   - Allow setting custom Jitsi room names

3. **Settings Integration** (~30 lines)
   - Add Jitsi server URL configuration
   - File: `client/src/shared/SettingsContext.tsx`

4. **Call Quality Monitoring** (~50 lines)
   - Analytics for connection quality
   - Logging for debugging

## Data Structures

### JitsiRoomMapping Interface
```typescript
interface JitsiRoomMapping {
  areaId: string;              // Interactive area ID
  jitsiRoomName: string;       // Sanitized Jitsi room name
  displayName?: string;        // Human-readable name
  createdAt: Date;
  updatedAt: Date;
}
```

### Event Payloads
```typescript
// area-entered event
{
  areaId: string;
  areaName: string;
  roomId: string;  // Jitsi room name
}

// area-exited event
{
  areaId: string;
  areaName: string;
}
```

### localStorage Structure
```json
{
  "stargety_jitsi_room_mappings": {
    "meeting-room": {
      "areaId": "meeting-room",
      "jitsiRoomName": "stargety-meeting-room-001",
      "displayName": "Main Meeting Room",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

## Edge Cases

### 1. Rapid Area Transitions
**Problem**: User walks through multiple areas quickly
**Solution**: Debounce room changes with 500ms delay

### 2. Connection Failures
**Problem**: Jitsi server unreachable
**Solution**: Retry with exponential backoff (max 3 attempts)

### 3. Call Continuation
**Problem**: User wants to continue call after leaving area
**Solution**: Sticky mode with confirmation modal

### 4. Multiple Users
**Problem**: Ensuring all users join same room
**Solution**: Consistent mapping via JitsiRoomMappingService

### 5. Modal Blocking
**Problem**: Area detection during modal interactions
**Solution**: Already handled by `shouldBlockBackgroundInteractions()`

## Testing Strategy

### Manual Testing
- [ ] Enter area → auto-join Jitsi
- [ ] Exit area → auto-leave Jitsi
- [ ] Walk through multiple areas → smooth transitions
- [ ] Open modal in area → no auto-join
- [ ] Connection failure → retry logic
- [ ] Multiple users in area → same room
- [ ] Custom room mapping → correct room
- [ ] Leave during call → sticky mode option

### Integration Testing
- [ ] EventBus events fire correctly
- [ ] localStorage persistence works
- [ ] Jitsi API integration stable
- [ ] No memory leaks
- [ ] Performance acceptable

## Configuration

### Jitsi Server Requirements
- CORS enabled for your domain
- External API enabled
- Appropriate room naming conventions
- (Optional) JWT authentication for private rooms

### Environment Variables (Future)
```env
VITE_JITSI_SERVER_URL=meet.stargety.com
VITE_JITSI_APP_ID=stargety-oasis
VITE_JITSI_JWT_SECRET=<secret>
```

## Migration Path to Database

When ready to move from localStorage to database:

1. **Backend API Endpoints**:
   - `GET /api/jitsi-mappings` - Get all mappings
   - `POST /api/jitsi-mappings` - Create/update mapping
   - `DELETE /api/jitsi-mappings/:areaId` - Delete mapping

2. **Update JitsiRoomMappingService**:
   - Replace localStorage calls with API calls
   - Keep localStorage as cache/fallback
   - Add sync mechanism for offline support

## Files Modified

### New Files
- `client/src/shared/JitsiRoomMappingService.ts` (~150 lines)
- `client/src/components/JitsiRoomMappingEditor.tsx` (~200 lines, Phase 3)
- `docs/jitsi-integration-plan.md` (this file)

### Modified Files
- `client/src/modules/world/WorldModule.tsx` (~50 lines changed)
- `client/src/components/VideoCommunicationPanel.tsx` (~100 lines changed)
- `client/src/modules/video-call/VideoCallModule.tsx` (~30 lines changed)
- `client/src/shared/EventBusContext.tsx` (~10 lines changed)
- `client/src/shared/SettingsContext.tsx` (~20 lines changed, Phase 3)

## Estimated Effort

- **Phase 1**: 1-2 days (core functionality)
- **Phase 2**: 1 day (edge cases & polish)
- **Phase 3**: 1 day (admin features, optional)
- **Testing**: 0.5 days
- **Total**: 3.5-4.5 days

## Success Criteria

1. ✅ User enters interactive area → Jitsi call auto-starts
2. ✅ User exits interactive area → Jitsi call auto-ends
3. ✅ Smooth transitions between multiple areas
4. ✅ No auto-join when modals are open
5. ✅ Graceful handling of connection failures
6. ✅ Multiple users join same room for same area
7. ✅ Custom room mappings work correctly
8. ✅ Option to continue call after leaving area

## Notes

- RingCentral code remains untouched (ignored when Jitsi is selected)
- All changes are non-breaking and can be feature-flagged
- Architecture follows existing patterns (EventBus, localStorage, React hooks)
- Simple, maintainable implementation with clear separation of concerns

