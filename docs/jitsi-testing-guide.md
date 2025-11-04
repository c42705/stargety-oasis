# Jitsi Auto-Join/Leave Testing Guide

## Prerequisites

1. **Jitsi Server**: Ensure `meet.stargety.com` is accessible and configured
2. **Interactive Areas**: Map should have at least 2-3 interactive areas defined
3. **Video Service**: Settings should be set to 'jitsi' (not 'ringcentral')
4. **User Account**: Logged in with a valid username

## Test Scenarios

### Test 1: Basic Auto-Join
**Objective**: Verify that entering an area automatically starts a Jitsi call

**Steps**:
1. Open the application
2. Navigate to the map view
3. Walk your character into an interactive area (e.g., "Meeting Room")
4. Wait 500ms (debounce delay)

**Expected Result**:
- ✅ VideoCommunicationPanel shows "Connecting..." state
- ✅ Jitsi iframe loads with the room name
- ✅ Console shows: `🚪 Area entered: [Area Name] - Auto-joining Jitsi room`
- ✅ You are connected to the Jitsi room

**Actual Result**: _____________

---

### Test 2: Basic Auto-Leave
**Objective**: Verify that exiting an area automatically ends the Jitsi call

**Steps**:
1. Continue from Test 1 (already in an area with active call)
2. Walk your character out of the interactive area
3. Wait 500ms (debounce delay)

**Expected Result**:
- ✅ Jitsi call disconnects
- ✅ VideoCommunicationPanel shows disconnected state
- ✅ Console shows: `🚪 Area exited: [Area Name] - Auto-leaving Jitsi room`

**Actual Result**: _____________

---

### Test 3: Rapid Area Transitions
**Objective**: Verify debouncing prevents rapid connect/disconnect cycles

**Steps**:
1. Walk quickly through multiple adjacent areas
2. Observe the connection behavior

**Expected Result**:
- ✅ No rapid connect/disconnect cycles
- ✅ Smooth transition between rooms
- ✅ Only connects to the final area after 500ms
- ✅ No console errors

**Actual Result**: _____________

---

### Test 4: Modal Blocking
**Objective**: Verify that modals prevent auto-join

**Steps**:
1. Walk into an interactive area
2. Immediately open a modal (e.g., settings, area form)
3. Observe if auto-join is triggered

**Expected Result**:
- ✅ No auto-join while modal is open
- ✅ `shouldBlockBackgroundInteractions()` prevents event emission
- ✅ After closing modal, walking into area triggers auto-join

**Actual Result**: _____________

---

### Test 5: Room Switching
**Objective**: Verify switching between different areas/rooms

**Steps**:
1. Walk into Area A (e.g., "Meeting Room")
2. Wait for connection
3. Walk directly into Area B (e.g., "Conference Room")
4. Wait 500ms

**Expected Result**:
- ✅ Disconnects from Area A's room
- ✅ Connects to Area B's room
- ✅ Smooth transition with 500ms delay
- ✅ Console shows both exit and enter events

**Actual Result**: _____________

---

### Test 6: Multiple Users Same Area
**Objective**: Verify multiple users join the same Jitsi room

**Steps**:
1. Open application in two browser windows/tabs
2. Log in as different users
3. Walk both characters into the same interactive area
4. Observe the Jitsi room

**Expected Result**:
- ✅ Both users join the same Jitsi room
- ✅ Room name is consistent (e.g., `stargety-meeting-room`)
- ✅ Users can see/hear each other
- ✅ Participant count shows 2

**Actual Result**: _____________

---

### Test 7: Custom Room Mapping
**Objective**: Verify custom room mappings work correctly

**Steps**:
1. Open browser console
2. Set custom mapping:
   ```javascript
   jitsiRoomMappingService.setJitsiRoomForArea('meeting-room', 'my-custom-room', 'Custom Room');
   ```
3. Walk into the "meeting-room" area
4. Check the Jitsi room name

**Expected Result**:
- ✅ Connects to 'my-custom-room' instead of default
- ✅ Mapping persists in localStorage
- ✅ Other users with same mapping join same room

**Actual Result**: _____________

---

### Test 8: Connection Persistence
**Objective**: Verify localStorage persistence across page reloads

**Steps**:
1. Set custom room mapping (from Test 7)
2. Reload the page
3. Walk into the same area
4. Check the room name

**Expected Result**:
- ✅ Custom mapping is preserved
- ✅ Connects to the custom room name
- ✅ No errors in console

**Actual Result**: _____________

---

### Test 9: Video Service Toggle
**Objective**: Verify auto-join only works for Jitsi

**Steps**:
1. Set video service to 'ringcentral' in settings
2. Walk into an interactive area
3. Observe behavior

**Expected Result**:
- ✅ No auto-join for RingCentral
- ✅ Manual connect button still works
- ✅ No console errors

**Actual Result**: _____________

---

### Test 10: Error Handling
**Objective**: Verify graceful handling of connection errors

**Steps**:
1. Disconnect from internet or block `meet.stargety.com`
2. Walk into an interactive area
3. Observe error handling

**Expected Result**:
- ✅ Error message displayed to user
- ✅ No infinite loading state
- ✅ Console shows error details
- ✅ Can retry connection

**Actual Result**: _____________

---

## Console Commands for Testing

### Check Current Mappings
```javascript
jitsiRoomMappingService.getAllMappings()
```

### Set Custom Mapping
```javascript
jitsiRoomMappingService.setJitsiRoomForArea('area-id', 'custom-room-name', 'Display Name')
```

### Get Room for Area
```javascript
jitsiRoomMappingService.getJitsiRoomForArea('area-id')
```

### Clear All Mappings
```javascript
jitsiRoomMappingService.clearAllMappings()
```

### Export Mappings (Backup)
```javascript
console.log(jitsiRoomMappingService.exportMappings())
```

### Import Mappings
```javascript
jitsiRoomMappingService.importMappings('{"area-id": {...}}')
```

### Check Server URL
```javascript
jitsiRoomMappingService.getJitsiServerUrl()
```

---

## Debugging Tips

### Enable Verbose Logging
The implementation already includes console logs for key events:
- `🚪 Area entered: [Name] - Auto-joining Jitsi room`
- `🚪 Area exited: [Name] - Auto-leaving Jitsi room`
- `✅ Loaded X Jitsi room mappings from localStorage`
- `✅ Set Jitsi room mapping: [areaId] → [roomName]`

### Check EventBus Events
```javascript
// In browser console
window.addEventListener('phaser-area-entered', (e) => console.log('Area entered:', e.detail));
window.addEventListener('phaser-area-exited', (e) => console.log('Area exited:', e.detail));
```

### Inspect localStorage
```javascript
// Check map data
JSON.parse(localStorage.getItem('stargety_shared_map_data'))

// Check Jitsi mappings
JSON.parse(localStorage.getItem('stargety_jitsi_room_mappings'))

// Check settings
JSON.parse(localStorage.getItem('stargetyOasisSettings'))
```

### Monitor Network Requests
1. Open DevTools → Network tab
2. Filter by "meet.stargety.com"
3. Watch for Jitsi API requests

---

## Performance Metrics

### Expected Performance
- **Area Detection**: < 16ms (runs in Phaser update loop)
- **Event Propagation**: < 10ms (EventBus publish/subscribe)
- **Debounce Delay**: 500ms (configurable)
- **Jitsi Connection**: 1-3 seconds (depends on network)

### Memory Usage
- **JitsiRoomMappingService**: ~1KB (singleton)
- **Event Listeners**: ~2KB (2 subscriptions)
- **localStorage**: ~1-5KB (depends on number of mappings)

---

## Known Limitations

1. **Debounce Delay**: Fixed at 500ms (not configurable via UI)
2. **No Sticky Mode**: Call always ends when leaving area (Phase 2 feature)
3. **No Retry Logic**: Connection failures require manual retry (Phase 2 feature)
4. **No Quality Monitoring**: No connection quality indicators (Phase 3 feature)
5. **No Admin UI**: Custom mappings require console commands (Phase 3 feature)

---

## Reporting Issues

When reporting issues, please include:
1. Test scenario number
2. Expected vs actual result
3. Console logs (errors and warnings)
4. Browser and version
5. Network conditions
6. localStorage state (if relevant)

---

## Success Criteria

All tests should pass with ✅ results. If any test fails, document the issue and proceed to Phase 2 implementation or bug fixes as needed.

