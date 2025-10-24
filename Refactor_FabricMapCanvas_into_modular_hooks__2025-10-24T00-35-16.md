[ ] NAME:Current Task List DESCRIPTION:Root task for conversation __NEW_AGENT__
-[/] NAME:during the refactoring, the feature for drawpolygon stop working DESCRIPTION:find the issue and fix, make the impassable polygon feature work again, along with edit the impassable polygon points as fabricjs native way as possible. review and create more task if needed
-[ ] NAME:2 or more users allowed DESCRIPTION:in earlier test, i tried to user an incognito tab to test 2 users, but i can only see individual sessions. investigate the potential causes and generate a report to act on in.
-[x] NAME:refactor layers panel DESCRIPTION:use spliter component to hold the layers panel on map editor, keep consistent padding space for the tree component, so it doesnt stick to the edges.
-[ ] NAME:refactor save button component DESCRIPTION:Refactor the SaveStatusIndicator component and its usage in the Map Editor with the following requirements:

**Toolbar Changes (EditorToolbar.tsx):**
1. Display only the "Save" button in the toolbar
2. Add a settings icon button next to the Save button that shows a tooltip with "Auto-save Settings"
3. When clicked, the settings button should open a configuration modal/popover with:
   - Toggle to enable/disable auto-save
   - Input field to configure auto-save interval (in minutes) after the last edit
   - The user should have full control over the auto-save interval

**Footer Changes (EditorStatusBar.tsx):**
1. Move the save metadata display to the footer area in the lower-right section
2. The footer should display:
   - "Last saved: [timestamp]" 
   - "[X] minutes ago" (relative time since last save)
3. Remove the duplicate "last saved" display on line 255 of the current file

**Component Structure:**
- The SaveStatusIndicator component should be split or refactored to support these two different display modes:
  - Compact mode for toolbar (button + settings only)
  - Detailed mode for footer (metadata display only)

**Goal:**
Separate concerns so the toolbar focuses on actions (save button + settings), while the footer displays status information (last saved timestamp and relative time).