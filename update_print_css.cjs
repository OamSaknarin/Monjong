const fs = require('fs');
let file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'font-family: var(--font-sans);',
  'font-family: var(--font-sarabun) !important;'
);
// replace multiple occurrences if needed

fs.writeFileSync(file, content);
console.log('Updated index.css');
