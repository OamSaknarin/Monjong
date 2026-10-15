const fs = require('fs');
const content = fs.readFileSync('src/utils/gasCode.ts', 'utf8');
const match = content.match(/export const GOOGLE_APPS_SCRIPT_CODE = \`([\s\S]*)\`;/);
if (match) {
  fs.writeFileSync('Code.gs', match[1]);
  console.log('Saved to Code.gs');
} else {
  console.log('Not found');
}
