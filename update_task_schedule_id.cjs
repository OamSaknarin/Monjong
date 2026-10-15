const fs = require('fs');
let file = 'src/components/TaskSchedule.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="bg-slate-100/80 border border-slate-200 p-4 rounded-2xl flex flex-col shadow-inner relative z-10">',
  '<div id="task-list-container" className="bg-slate-100/80 border border-slate-200 p-4 rounded-2xl flex flex-col shadow-inner relative z-10">'
);

fs.writeFileSync(file, content);
console.log('Updated TaskSchedule.tsx');
