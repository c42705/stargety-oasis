Based on my analysis of the migration-related files, here's the documentation of files that need to be removed:

Migration Cleanup Plan
Files to Remove
1. MigrationModal.tsx
Purpose: UI component for migrating old layer-based characters to V2 sprite-sheet system
Why Remove: No longer needed since there are no legacy avatars - all users have v2 avatars
Size: 368 lines
Dependencies: Imports MigrationDetector and MigrationConverter (also to be removed)

2. MigrationDetector.ts
Purpose: Detects old layer-based characters that need migration to V2 system
Why Remove: Legacy detection logic is unnecessary when no legacy avatars exist
Size: 301 lines
Note: Contains comments indicating the old layer-based system has been completely removed

3. MigrationConverter.ts
Purpose: Converts old layer-based characters to new sprite-sheet-based V2 format
Why Remove: Conversion logic is unnecessary when no legacy avatars exist
Size: 267 lines
Dependencies: Imports MigrationDetector (also to be removed)

4. AvatarBuilderStorage.ts
Purpose: V1 Legacy Facade that delegates to V2 CharacterStorage
Why Remove: Marked as "Legacy FACADE" with comments to migrate callers to v2/CharacterStorage directly
Size: 129 lines
Status: Already deprecated in favor of direct v2 usage

Additional Cleanup Actions
Check for Remaining References
Search for any imports or references to these components in other files
Remove any associated CSS files if they exist
Update any documentation that references these migration components
Benefits of Cleanup
Reduce codebase complexity: Remove ~1,065 lines of unnecessary code
Improve maintainability: Eliminate dead code that could confuse developers
Simplify avatar system: Clean up legacy migration logic
Better performance: Remove unused imports and component overhead
Verification Steps
Remove the four files listed above
Search the codebase for any remaining references to these components
Test the avatar functionality to ensure it still works correctly
Verify that all v2 avatar features remain functional
This cleanup will streamline the avatar system and remove unnecessary complexity from the codebase.