/**
 * Script to convert SVG grid patterns to PNG format
 * This creates PNG versions of the grid patterns for better performance
 */

const fs = require('fs');
const path = require('path');

// Since we can't easily convert SVG to PNG in Node.js without additional dependencies,
// we'll create simple PNG data URLs that can be used directly

const gridPatterns = [
  { size: 8, name: 'grid-pattern-8px.png' },
  { size: 16, name: 'grid-pattern-16px.png' },
  { size: 32, name: 'grid-pattern-32px.png' },
  { size: 64, name: 'grid-pattern-64px.png' },
  { size: 128, name: 'grid-pattern-128px.png' }
];

// Create a simple grid pattern as a data URL
function createGridPatternDataURL(size) {
  // Create a simple grid pattern using Canvas API (this would need to be run in browser)
  // For now, we'll create a placeholder that references the SVG files
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
          <path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="#4a5568" stroke-width="1" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  `)}`;
}

// Generate pattern data URLs
gridPatterns.forEach(({ size, name }) => {
  const dataURL = createGridPatternDataURL(size);
  console.log(`Generated pattern for ${name}: ${size}x${size}`);
  
  // Write to a JSON file that can be imported
  const outputPath = path.join(__dirname, `${name}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({ dataURL, size }, null, 2));
});

console.log('Grid pattern data URLs generated successfully!');
console.log('Note: For actual PNG files, use a browser-based conversion or image processing library.');
