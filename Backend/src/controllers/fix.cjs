const fs = require('fs');

// Read the file
const content = fs.readFileSync('punch.controller.js', 'utf8');

// Remove the problematic duplicate function block
const fixed = content.replace(/\};\s*\n\s*console\.error\("Error in manualOutPunchOverride:", err\);\s*\n\s*return res\.status\(500\)\.json\(\{ error: "Server error" \}\);\s*\n\s*\}\s*;/, '');

// Write the fixed content to a new file
fs.writeFileSync('punch.controller.fixed.js', fixed);

console.log('File fixed successfully!');