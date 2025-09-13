/**
 * Grid Pattern Generator
 * 
 * This script generates the grid pattern images for the map editor.
 * Run with: node generatePatterns.js
 */

const fs = require('fs');
const path = require('path');

// Grid pattern configurations
const patterns = [
  { size: 8, name: 'grid-pattern-8px.svg' },
  { size: 16, name: 'grid-pattern-16px.svg' },
  { size: 32, name: 'grid-pattern-32px.svg' },
  { size: 64, name: 'grid-pattern-64px.svg' },
  { size: 128, name: 'grid-pattern-128px.svg' }
];

// Generate SVG pattern for a given size
function generateSVGPattern(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="#4a5568" stroke-width="1" opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
</svg>`;
}

// Generate all patterns
patterns.forEach(({ size, name }) => {
  const svgContent = generateSVGPattern(size);
  const filePath = path.join(__dirname, name);
  
  fs.writeFileSync(filePath, svgContent);
  console.log(`Generated ${name} (${size}x${size})`);
});

console.log('All grid patterns generated successfully!');
console.log('Note: These are SVG files. For PNG conversion, use an SVG to PNG converter.');
