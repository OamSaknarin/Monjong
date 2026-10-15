const fs = require('fs');
let file = 'src/utils/googleSheetsClient.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const values = tasks.map(t => [t.id, t.date, t.task, t.status, t.type]);",
  "const values = tasks.map(t => [t.id, t.date, t.task, t.status, t.type, t.originalDate || t.date]);"
);

content = content.replace(/!A2:E/g, "!A2:F");

content = content.replace(
  "    type: row[4]\n  }));",
  "    type: row[4],\n    originalDate: row[5] || row[1]\n  }));"
);

fs.writeFileSync(file, content);
console.log('Fixed googleSheetsClient.ts');
