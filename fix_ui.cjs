const fs = require('fs');
let file = 'src/components/TaskSchedule.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div id="task-list-container" className="bg-slate-100/80 border border-slate-200 p-4 rounded-2xl flex flex-col shadow-inner relative z-10">',
  '<div id="task-list-container" className="bg-slate-100/80 border border-slate-200 p-4 rounded-2xl flex flex-col shadow-inner relative z-10 flex-1 min-h-[300px] max-h-[60vh] overflow-y-auto scroll-smooth">'
);

fs.writeFileSync(file, content);
console.log('Fixed UI');
