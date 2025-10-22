/**
 * Color Utility Functions
 * 
 * Provides color manipulation and calculation utilities for the map editor.
 */

/**
 * Calculate a contrasting text color (black or white) for a given background color
 * 
 * Uses the relative luminance formula to determine whether black or white text
 * would be more readable on the given background color.
 * 
 * @param hexColor - Hex color string (e.g., '#FF5733')
 * @returns '#000000' for light backgrounds, '#ffffff' for dark backgrounds
 * 
 * @example
 * ```typescript
 * getContrastColor('#FFFFFF') // Returns '#000000' (black on white)
 * getContrastColor('#000000') // Returns '#ffffff' (white on black)
 * getContrastColor('#3b82f6') // Returns '#ffffff' (white on blue)
 * ```
 */
export function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate relative luminance using the standard formula
  // https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark colors
  // Threshold of 0.5 provides good contrast in most cases
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

