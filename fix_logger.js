const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/inventory/scheduler.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The regex matches logger.<level>(`<msg>` | '<msg>', { <obj> })
// We need to carefully swap string and object.
const regex = /logger\.(info|error)\((`[^`]+`|'[^']+'),\s*(\{[\s\S]*?\})\);/g;
content = content.replace(regex, (match, level, msg, obj) => {
  return `logger.${level}(${obj}, ${msg});`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed logger calls in scheduler.ts');
