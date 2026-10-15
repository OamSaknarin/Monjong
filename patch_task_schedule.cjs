const fs = require('fs');

let content = fs.readFileSync('src/components/TaskSchedule.tsx', 'utf8');

// Add handleExportPdf
content = content.replace(
  /const handleExport = \(\) => \{/,
  `const handleExportPdf = () => {
    window.print();
  };

  const handleExport = () => {`
);

// Replace the single export button with two buttons
content = content.replace(
  /<button\s+onClick=\{handleExport\}\s+className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-rose-200 text-rose-800 hover:text-white hover:bg-rose-500 hover:border-rose-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95"\s*>\s*<Download className="w-4 h-4" \/>\s*<span>ส่งออก Excel<\/span>\s*<\/button>/m,
  `<div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-rose-200 text-rose-800 hover:text-white hover:bg-rose-500 hover:border-rose-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-800 hover:text-white hover:bg-red-500 hover:border-red-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>`
);

fs.writeFileSync('src/components/TaskSchedule.tsx', content);
