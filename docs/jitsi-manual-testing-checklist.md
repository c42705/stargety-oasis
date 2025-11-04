# Jitsi Integration - Manual Testing Checklist

## Overview
This document provides a comprehensive checklist for manually testing all Jitsi integration features. Complete each test scenario and mark with ✅ when passing or ❌ when failing.

**Testing Date**: _____________
**Tester Name**: _____________
**Browser**: _____________
**OS**: _____________

---

## Pre-Testing Setup

### Environment Verification
- [ ] Application running on http://localhost:3000
- [ ] No TypeScript compilation errors
- [ ] Browser console open (F12) for monitoring
- [ ] Camera and microphone permissions granted
- [ ] Stable internet connection
- [ ] Jitsi server (meet.stargety.com) accessible

### Test User Setup
- [ ] Admin user logged in
- [ ] Regular user account available for multi-user tests
- [ ] Second device/browser available for multi-user tests

---

## Phase 1: Core Auto-Join/Leave Functionality

### Test 1.1: Basic Area Entry (Auto-Join)
**Objective**: Verify automatic video call join when entering a meeting area

**Steps**:
1. Navigate character to a position outside any meeting area
2. Walk character into a meeting area
3. Observe video panel behavior

**Expected Results**:
- [ ] Video panel opens automatically
- [ ] "Connecting..." or loading state appears
- [ ] Jitsi interface loads within 2-3 seconds
- [ ] Console shows: `📊 Analytics: Started session {sessionId} for room {roomId}`
- [ ] Console shows: `✅ Jitsi initialized successfully`
- [ ] Participant count shows "1"
- [ ] Connection quality indicator appears

**Actual Results**: _____________

---

### Test 1.2: Basic Area Exit (Auto-Leave)
**Objective**: Verify automatic video call disconnect when leaving a meeting area

**Steps**:
1. Join a video call by entering a meeting area (Test 1.1)
2. Wait for call to fully connect
3. Walk character out of the meeting area
4. Observe video panel behavior

**Expected Results**:
- [ ] 500ms delay before disconnect (debouncing)
- [ ] Video panel closes or shows "Not in a call"
- [ ] Jitsi interface disposed
- [ ] Console shows: `📊 Analytics: Ended session {sessionId} (duration: {X}s)`
- [ ] No errors in console

**Actual Results**: _____________

---

### Test 1.3: Room Name Mapping
**Objective**: Verify correct Jitsi room name generation from area ID

**Steps**:
1. Open browser console
2. Enter a meeting area with ID "meeting-room"
3. Check console for room name

**Expected Results**:
- [ ] Console shows room name: `stargety-meeting-room`
- [ ] Room name is sanitized (no special characters except hyphens)
- [ ] Room name is lowercase

**Actual Results**: _____________

---

### Test 1.4: Multiple Area Transitions
**Objective**: Verify correct behavior when moving between different meeting areas

**Steps**:
1. Enter meeting area A
2. Wait for call to connect
3. Walk directly into meeting area B (without exiting A first)
4. Observe behavior

**Expected Results**:
- [ ] Disconnect from area A's call
- [ ] Connect to area B's call
- [ ] 500ms debounce delay applied
- [ ] No overlapping calls
- [ ] Analytics session ended for area A
- [ ] Analytics session started for area B

**Actual Results**: _____________

---

## Phase 2: Edge Cases & Error Handling

### Test 2.1: Rapid Area Transitions (Debouncing)
**Objective**: Verify debouncing prevents rapid connect/disconnect cycles

**Steps**:
1. Walk character quickly in and out of a meeting area (< 500ms)
2. Repeat 3-4 times rapidly
3. Observe video panel behavior

**Expected Results**:
- [ ] Video call does NOT start if you exit within 500ms
- [ ] Only one connection attempt made
- [ ] No rapid connect/disconnect cycles
- [ ] Console shows debouncing in action

**Actual Results**: _____________

---

### Test 2.2: Connection Retry Logic
**Objective**: Verify exponential backoff retry on connection failure

**Steps**:
1. Disconnect from internet (or block meet.stargety.com in hosts file)
2. Enter a meeting area
3. Observe retry behavior
4. Reconnect internet after 2nd retry

**Expected Results**:
- [ ] Initial connection attempt fails
- [ ] Retry 1 after 1 second
- [ ] Retry 2 after 2 seconds
- [ ] Retry 3 after 4 seconds
- [ ] Error message shown after 3 failed retries
- [ ] Console shows retry attempts with countdown
- [ ] If reconnected during retries, connection succeeds

**Actual Results**: _____________

---

### Test 2.3: Sticky Mode - Enable and Stay Connected
**Objective**: Verify sticky mode allows continuing call after leaving area

**Steps**:
1. Enter a meeting area and join call
2. Enable sticky mode (click pushpin icon)
3. Walk out of the meeting area
4. Observe confirmation modal

**Expected Results**:
- [ ] Pushpin icon is highlighted when sticky mode enabled
- [ ] Confirmation modal appears when exiting area
- [ ] Modal shows "Leave Call" and "Stay Connected" buttons
- [ ] Clicking "Stay Connected" keeps call active
- [ ] Video panel remains open
- [ ] Can manually leave call with "Leave Call" button

**Actual Results**: _____________

---

### Test 2.4: Sticky Mode - Leave Call
**Objective**: Verify sticky mode confirmation allows leaving call

**Steps**:
1. Enter a meeting area and join call
2. Enable sticky mode
3. Walk out of the meeting area
4. Click "Leave Call" in confirmation modal

**Expected Results**:
- [ ] Confirmation modal appears
- [ ] Clicking "Leave Call" disconnects from call
- [ ] Video panel closes
- [ ] Analytics session ended
- [ ] Sticky mode remains enabled for next call

**Actual Results**: _____________

---

### Test 2.5: Connection Quality Monitoring
**Objective**: Verify connection quality indicator updates correctly

**Steps**:
1. Join a video call
2. Use browser DevTools to throttle network (Network tab → Throttling → Slow 3G)
3. Observe connection quality indicator
4. Restore normal network speed

**Expected Results**:
- [ ] Quality starts as "Good" (green)
- [ ] Quality changes to "Poor" (red) with throttling
- [ ] Console shows: `📶 Connection quality: poor (X%)`
- [ ] Analytics logs quality change
- [ ] Quality returns to "Good" when network restored

**Actual Results**: _____________

---

### Test 2.6: Error Handling
**Objective**: Verify graceful error handling and user-friendly messages

**Steps**:
1. Block Jitsi server in browser (hosts file or firewall)
2. Enter a meeting area
3. Observe error behavior

**Expected Results**:
- [ ] User-friendly error message displayed
- [ ] No application crash
- [ ] Console shows error details
- [ ] Analytics logs error
- [ ] Can retry or leave area without issues

**Actual Results**: _____________

---

## Phase 3: Admin Features & Polish

### Test 3.1: Jitsi Room Mapping Editor - View
**Objective**: Verify room mapping editor displays correctly

**Steps**:
1. Login as admin user
2. Open Map Editor
3. Click "Jitsi Rooms" tab

**Expected Results**:
- [ ] Jitsi Rooms tab visible (Video icon)
- [ ] Table displays all area-to-room mappings
- [ ] Columns: Area ID, Jitsi Room Name, Display Name, Type, Actions
- [ ] Pagination works (if > 10 mappings)
- [ ] Sorting works on all columns

**Actual Results**: _____________

---

### Test 3.2: Jitsi Room Mapping Editor - Add Custom Mapping
**Objective**: Verify adding custom room mapping

**Steps**:
1. In Jitsi Rooms tab, click "Add Mapping"
2. Enter Area ID: "test-area"
3. Enter Jitsi Room Name: "My Custom Room!"
4. Enter Display Name: "Test Meeting Room"
5. Click "Add"

**Expected Results**:
- [ ] Modal opens with form
- [ ] Room name auto-sanitizes to "my-custom-room"
- [ ] Mapping added to table
- [ ] Type shows "Custom" (blue tag)
- [ ] Saved to localStorage
- [ ] Success message shown

**Actual Results**: _____________

---

### Test 3.3: Jitsi Room Mapping Editor - Edit Mapping
**Objective**: Verify editing existing room mapping

**Steps**:
1. Click Edit icon on a mapping
2. Change Jitsi Room Name
3. Click "Save"

**Expected Results**:
- [ ] Modal opens with pre-filled values
- [ ] Changes saved to table
- [ ] Saved to localStorage
- [ ] Success message shown

**Actual Results**: _____________

---

### Test 3.4: Jitsi Room Mapping Editor - Delete Mapping
**Objective**: Verify deleting custom room mapping

**Steps**:
1. Click Delete icon on a custom mapping
2. Confirm deletion in popconfirm

**Expected Results**:
- [ ] Popconfirm appears
- [ ] Mapping removed from table
- [ ] Reverts to auto-generated room name
- [ ] Saved to localStorage
- [ ] Success message shown

**Actual Results**: _____________

---

### Test 3.5: Jitsi Room Mapping Editor - Export/Import
**Objective**: Verify export and import functionality

**Steps**:
1. Click "Export Mappings"
2. Save JSON file
3. Click "Clear All" and confirm
4. Click "Import Mappings"
5. Select the exported JSON file

**Expected Results**:
- [ ] Export downloads JSON file
- [ ] JSON contains all mappings
- [ ] Clear All removes all custom mappings
- [ ] Import restores mappings from JSON
- [ ] Success messages shown

**Actual Results**: _____________

---

### Test 3.6: Jitsi Server Configuration
**Objective**: Verify custom Jitsi server URL configuration

**Steps**:
1. Login as admin user
2. Open Settings
3. Select "Jitsi Meet" as video service
4. Scroll to "Jitsi Server Configuration"
5. Change server URL to "meet.jit.si"
6. Click "Save Changes"
7. Reload page
8. Enter a meeting area

**Expected Results**:
- [ ] Server configuration section visible (only when Jitsi selected)
- [ ] Input field shows current server URL
- [ ] Configuration tips card displayed
- [ ] Settings saved to localStorage
- [ ] Settings persist after reload
- [ ] Video call uses new server URL

**Actual Results**: _____________

---

### Test 3.7: Analytics - Session Tracking
**Objective**: Verify analytics service tracks call sessions

**Steps**:
1. Open browser console
2. Enter a meeting area and join call
3. Stay in call for 30 seconds
4. Leave call
5. Run in console: `jitsiAnalyticsService.getAllSessions()`

**Expected Results**:
- [ ] Console shows session data
- [ ] Session includes: sessionId, roomId, startTime, endTime, duration
- [ ] Duration approximately 30 seconds
- [ ] Participant count recorded
- [ ] Quality events recorded
- [ ] No errors in session (if connection was good)

**Actual Results**: _____________

---

### Test 3.8: Analytics - Quality Tracking
**Objective**: Verify analytics tracks quality changes

**Steps**:
1. Join a call
2. Throttle network to trigger quality changes
3. Leave call
4. Run in console: `jitsiAnalyticsService.getSummary()`

**Expected Results**:
- [ ] Summary shows quality distribution
- [ ] Quality events logged in session
- [ ] Average quality calculated correctly
- [ ] Console logs show quality changes

**Actual Results**: _____________

---

## Multi-User Testing

### Test 4.1: Two Users in Same Area
**Objective**: Verify multiple users can join same call

**Steps**:
1. User A enters meeting area
2. User B enters same meeting area
3. Observe both video panels

**Expected Results**:
- [ ] Both users join same Jitsi room
- [ ] Both users see each other in participant list
- [ ] Participant count shows "2" for both users
- [ ] Audio/video works between users
- [ ] Analytics tracks both sessions

**Actual Results**: _____________

---

### Test 4.2: User Joins While Another is in Call
**Objective**: Verify late join works correctly

**Steps**:
1. User A enters meeting area and joins call
2. Wait 10 seconds
3. User B enters same meeting area

**Expected Results**:
- [ ] User B joins existing call
- [ ] User A sees User B join
- [ ] Participant count updates for both users
- [ ] No disruption to User A's call

**Actual Results**: _____________

---

### Test 4.3: User Leaves While Others Remain
**Objective**: Verify graceful leave doesn't affect others

**Steps**:
1. User A and User B in same call
2. User A leaves meeting area
3. Observe User B's call

**Expected Results**:
- [ ] User A disconnects
- [ ] User B's call continues
- [ ] Participant count updates for User B
- [ ] No errors for either user

**Actual Results**: _____________

---

## Integration Testing

### Test 5.1: EventBus Integration
**Objective**: Verify EventBus events fire correctly

**Steps**:
1. Open browser console
2. Subscribe to events:
```javascript
eventBus.subscribe('area-entered', (data) => console.log('AREA ENTERED:', data));
eventBus.subscribe('area-exited', (data) => console.log('AREA EXITED:', data));
```
3. Enter and exit meeting areas

**Expected Results**:
- [ ] `area-entered` event fires with correct data (areaId, areaName, roomId)
- [ ] `area-exited` event fires with correct data (areaId, areaName)
- [ ] Events fire before video call connection
- [ ] No duplicate events

**Actual Results**: _____________

---

### Test 5.2: localStorage Persistence
**Objective**: Verify data persists across page reloads

**Steps**:
1. Add custom room mapping
2. Change Jitsi server URL
3. Join a call (for analytics)
4. Reload page
5. Check all data

**Expected Results**:
- [ ] Room mappings persist (key: `stargety_jitsi_room_mappings`)
- [ ] Server URL persists (key: `stargetyOasisSettings`)
- [ ] Analytics sessions persist (key: `stargety_jitsi_analytics`)
- [ ] All data loads correctly after reload

**Actual Results**: _____________

---

### Test 5.3: Memory Leak Check
**Objective**: Verify no memory leaks from repeated join/leave

**Steps**:
1. Open browser DevTools → Performance → Memory
2. Take heap snapshot
3. Join and leave calls 10 times
4. Take another heap snapshot
5. Compare snapshots

**Expected Results**:
- [ ] No significant memory increase
- [ ] Jitsi API properly disposed
- [ ] Event listeners cleaned up
- [ ] Timeouts cleared

**Actual Results**: _____________

---

## Performance Testing

### Test 6.1: Large Number of Areas
**Objective**: Verify performance with many meeting areas

**Steps**:
1. Create map with 20+ meeting areas
2. Walk character through multiple areas
3. Monitor performance

**Expected Results**:
- [ ] No lag or stuttering
- [ ] Collision detection remains fast
- [ ] Video calls connect smoothly
- [ ] No performance degradation

**Actual Results**: _____________

---

## Browser Compatibility

### Test 7.1: Chrome
- [ ] All features work
- [ ] No console errors
- [ ] Video/audio quality good

### Test 7.2: Firefox
- [ ] All features work
- [ ] No console errors
- [ ] Video/audio quality good

### Test 7.3: Edge
- [ ] All features work
- [ ] No console errors
- [ ] Video/audio quality good

### Test 7.4: Safari (if available)
- [ ] All features work
- [ ] No console errors
- [ ] Video/audio quality good

---

## Summary

**Total Tests**: 35
**Passed**: _____
**Failed**: _____
**Blocked**: _____

**Critical Issues Found**: _____________

**Recommendations**: _____________

**Sign-off**: _____________
**Date**: _____________

