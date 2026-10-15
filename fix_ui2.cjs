const fs = require('fs');
let file = 'src/components/TaskSchedule.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="lg:col-span-6 flex flex-col bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.03] p-4 sm:p-5 rounded-3xl border-2 border-rose-200/60 shadow-md relative overflow-hidden" id="calendar-container-card">',
  '<div className="lg:col-span-6 flex flex-col h-full bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.03] p-4 sm:p-5 rounded-3xl border-2 border-rose-200/60 shadow-md relative overflow-hidden" id="calendar-container-card">'
);

content = content.replace(
  '<div className="lg:col-span-6 flex flex-col bg-slate-50/95 rounded-3xl p-4 sm:p-5 border-2 border-slate-200/80 shadow-xl relative overflow-hidden" id="task-detail-side-panel">',
  '<div className="lg:col-span-6 flex flex-col h-full bg-slate-50/95 rounded-3xl p-4 sm:p-5 border-2 border-slate-200/80 shadow-xl relative overflow-hidden" id="task-detail-side-panel">'
);

fs.writeFileSync(file, content);
console.log('Fixed UI 2');
