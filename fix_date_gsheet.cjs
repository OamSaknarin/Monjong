const fs = require('fs');
let file = 'src/utils/googleSheetsClient.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('normalizeDateString')) {
  content = content.replace(
    "import { getAccessToken } from './auth';",
    "import { getAccessToken } from './auth';\nimport { normalizeDateString } from './gasClient';"
  );
  
  content = content.replace(
    "    date: row[1],",
    "    date: normalizeDateString(row[1]),"
  );
  
  content = content.replace(
    "    originalDate: row[5] || row[1]",
    "    originalDate: normalizeDateString(row[5] || row[1])"
  );
}

fs.writeFileSync(file, content);
console.log('Fixed googleSheetsClient.ts');
