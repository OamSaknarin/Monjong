const fs = require('fs');
let file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'body {\n  font-family: var(--font-sarabun) !important;',
  'body {\n  font-family: var(--font-sans);'
);

content = content.replace(
  '  #printable-volunteer-profile {\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 100%;\n    margin: 0;\n    padding: 20px;\n    background: white !important;\n    color: black !important;\n    font-family: var(--font-sans);\n  }',
  '  #printable-volunteer-profile {\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 100%;\n    margin: 0;\n    padding: 20px;\n    background: white !important;\n    color: black !important;\n    font-family: var(--font-sarabun) !important;\n  }'
);

content = content.replace(
  '@media print {\n  button,',
  '@media print {\n  * {\n    font-family: var(--font-sarabun) !important;\n  }\n  button,'
);

fs.writeFileSync(file, content);
console.log('Fixed index.css');
