const fs = require('fs');

// Read the file
const content = fs.readFileSync('punch.controller.js', 'utf8');

// Fix the duplicate function and syntax error
const fixedContent = content.replace(
  /res\.status\(200\)\.json\({ success: true }\);\s*} catch \(err\) {\s*console\.error\("\[updateManualMonthlyAttendance\]", err\);\s*res\.status\(500\)\.json\({ error: "Failed to update monthly attendance" }\);\s*}\s*};\s*export const updateManualMonthlyAttendance[\s\S]*?console\.error\("\[cleanupDuplicatePunches\]", err\);\s*res\.status\(500\)\.json\({ error: "Failed to cleanup duplicate punches" }\);\s*}\s*};/g,
  'res.status(200).json({ success: true });\n  } catch (err) {\n    console.error("[updateManualMonthlyAttendance]", err);\n    res.status(500).json({ error: "Failed to update monthly attendance" });\n  }\n};'
);

// Write the fixed content back to the file
fs.writeFileSync('punch.controller.js', fixedContent);

console.log('File fixed successfully');