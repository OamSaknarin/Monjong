const fs = require('fs');
let file = 'src/utils/gasClient.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'tasks: { name: "ตารางงาน", headers: ["ID", "Date", "Task", "Status", "Type"] },',
  'tasks: { name: "ตารางงาน", headers: ["ID", "Date", "Task", "Status", "Type", "OriginalDate"] },'
);

content = content.replace(
  "tasks: (rawData.tasks || rawData['ตารางงาน'] || []).map((t: any) => ({ ...t, date: normalizeDateString(t.date) })),",
  "tasks: (rawData.tasks || rawData['ตารางงาน'] || []).map((t: any) => ({ ...t, date: normalizeDateString(t.date), originalDate: normalizeDateString(t.originalDate || t.date) })),"
);

fs.writeFileSync(file, content);
console.log('Fixed gasClient.ts');
