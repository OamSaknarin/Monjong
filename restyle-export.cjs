const fs = require('fs');

let code = fs.readFileSync('src/components/RainDailyEWS.tsx', 'utf8');
const exportStart = code.indexOf('exportLayout = (');
const exportEnd = code.indexOf('  return (\n    <div \n      className="relative space-y-6"');

if (exportStart > -1 && exportEnd > -1) {
  let exportCode = code.substring(exportStart, exportEnd);

  exportCode = exportCode.replace(/bg-blue-500\/10/g, 'bg-orange-300/20');
  exportCode = exportCode.replace(/bg-emerald-500\/10/g, 'bg-amber-300/20');
  
  exportCode = exportCode.replace(/bg-white\/5/g, 'bg-white');
  exportCode = exportCode.replace(/border-white\/10/g, 'border-orange-200');
  exportCode = exportCode.replace(/border-white\/15/g, 'border-orange-200');
  exportCode = exportCode.replace(/border-white\/20/g, 'border-orange-300');
  
  exportCode = exportCode.replace(/text-blue-300/g, 'text-orange-900');
  exportCode = exportCode.replace(/bg-blue-500\/20/g, 'bg-orange-200');
  exportCode = exportCode.replace(/border-blue-500\/30/g, 'border-orange-300');
  
  exportCode = exportCode.replace(/text-white/g, 'text-orange-950');
  exportCode = exportCode.replace(/text-slate-400/g, 'text-orange-800');
  exportCode = exportCode.replace(/text-slate-300/g, 'text-orange-900');
  exportCode = exportCode.replace(/text-slate-500/g, 'text-orange-800');
  
  exportCode = exportCode.replace(/bg-slate-950\/60/g, 'bg-white border-2 border-orange-200');
  exportCode = exportCode.replace(/bg-slate-900\/60/g, 'bg-orange-100');
  exportCode = exportCode.replace(/bg-slate-800\/80/g, 'bg-white border-2 border-orange-200');
  exportCode = exportCode.replace(/bg-slate-900/g, 'bg-white');
  
  exportCode = exportCode.replace(/text-rose-200/g, 'text-red-800');
  exportCode = exportCode.replace(/text-rose-400/g, 'text-red-600');
  exportCode = exportCode.replace(/text-amber-300/g, 'text-amber-700');
  exportCode = exportCode.replace(/text-blue-400/g, 'text-blue-700');
  exportCode = exportCode.replace(/text-emerald-400/g, 'text-emerald-700');
  
  exportCode = exportCode.replace(/bg-white\/10/g, 'bg-orange-50 border border-orange-100');
  exportCode = exportCode.replace(/bg-slate-950/g, 'bg-orange-50 text-orange-950 border border-orange-200');
  exportCode = exportCode.replace(/bg-white\/15/g, 'bg-orange-100');
  
  // Also any hardcoded shadow-slate-950/50 etc
  exportCode = exportCode.replace(/shadow-slate-950\/50/g, 'shadow-orange-900/10');
  
  // Make borders explicitly visible for all sections "ใส่กรอบให้แต่ละส่วน"
  exportCode = exportCode.replace(/<div className="flex flex-col justify-between">/g, '<div className="flex flex-col justify-between bg-white border-2 border-orange-300 p-6">');
  exportCode = exportCode.replace(/<div className="flex flex-col justify-between overflow-hidden">/g, '<div className="flex flex-col justify-between overflow-hidden bg-white border-2 border-orange-300 p-6">');
  // Or just rely on existing classes and add border-2 border-orange-300 to them.

  // Restore some text colors inside tags that got replaced improperly if any.
  // We'll see.
  
  code = code.substring(0, exportStart) + exportCode + code.substring(exportEnd);
  fs.writeFileSync('src/components/RainDailyEWS.tsx', code);
}
