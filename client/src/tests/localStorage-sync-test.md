# localStorage Map Data Synchronization Test

This document describes how to test the localStorage synchronization between the Map Editor and the Playable Game Map.

## Test Setup

1. **Open the application** in your browser
2. **Navigate to the Map Editor** module
3. **Navigate to the World/Game** module in a separate tab or window

## Test Cases

### Test 1: Editor Changes Persist to localStorage

1. **In Map Editor:**
   - Add a new interactive area
   - Modify an existing area (position, size, or properties)
   - Remove an area
   - Verify the save status indicator shows "saved"

2. **Verify localStorage:**
   - Open browser DevTools (F12)
   - Go to Application/Storage tab
   - Check localStorage for key: `stargety_shared_map_data`
   - Verify the JSON contains your changes

### Test 2: Playable Map Reads from localStorage

1. **In World/Game Module:**
   - Refresh the page/tab
   - Verify that the game world displays the same areas as saved in the editor
   - Check that area positions, sizes, and properties match

### Test 3: Data Consistency Between Editor and Game

1. **Compare both modules:**
   - Interactive areas should be identical in both editor and game
   - Map dimensions should match
   - Object counts should be the same
   - Positions and properties should be consistent

### Test 4: Page Refresh Requirement

1. **Make changes in editor**
2. **Without refreshing the game tab:**
   - Game should still show old data (static behavior)
3. **Refresh the game tab:**
   - Game should now show the updated data from localStorage

### Test 5: Error Handling

1. **Clear localStorage:**
   - In DevTools, delete the `stargety_shared_map_data` key
   - Refresh both editor and game
   - Both should fall back to default map data

2. **Corrupt localStorage:**
   - Manually edit the localStorage value to invalid JSON
   - Refresh both modules
   - Both should handle the error gracefully and use default data

## Expected Behavior

✅ **Editor Behavior:**
- Saves to localStorage immediately on changes
- Persists data across browser sessions
- Loads existing data on initialization
- Falls back to default map if localStorage is empty/corrupted

✅ **Playable Map Behavior:**
- Reads from localStorage only on page load/initialization
- Does not update dynamically during gameplay
- Requires page refresh to see editor changes
- Handles missing/invalid localStorage data gracefully

✅ **Data Consistency:**
- Both modules display identical map data
- All object properties match between editor and game
- Map dimensions are consistent
- Spatial relationships are preserved

## Implementation Details

The synchronization is implemented through:

1. **SharedMapSystem.ts** - Core localStorage management
2. **PhaserMapRenderer.ts** - Game world rendering from shared data
3. **MapEditorModule.tsx** - Editor integration with shared system
4. **WorldModule.tsx** - Game integration with shared system

The system uses the localStorage key `stargety_shared_map_data` as the single source of truth for map data.
