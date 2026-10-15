const fs = require('fs');

let code = fs.readFileSync('src/components/RainDailyEWS.tsx', 'utf8');

// 1. In confirmExport, change 'rain-ews-monitor-module' to 'rain-ews-export-module'
code = code.replace(
  "const element = document.getElementById('rain-ews-monitor-module');",
  "const element = document.getElementById('rain-ews-export-module');"
);

// 2. Wrap the early return for isExporting into a variable exportLayout
// Look for `if (isExporting) {` which is followed by `const textToScan`
// Then it returns `<div id="rain-ews-monitor-module"...`
// We need to change that.

let exportBlockStart = code.indexOf('if (isExporting) {\n    // Extract and parse');
if (exportBlockStart === -1) {
  exportBlockStart = code.indexOf('if (isExporting) {\n'); // Fallback
}
// We will replace `if (isExporting) {` with `let exportLayout = null;\n  if (isExporting) {`
code = code.replace(
  'if (isExporting) {\n    // Extract and parse TMD warning fields',
  'let exportLayout = null;\n  if (isExporting) {\n    // Extract and parse TMD warning fields'
);

// Find the return statement inside the isExporting block
code = code.replace(
  `return (\n      <div \n        id="rain-ews-monitor-module"\n        className="w-[1200px] h-[1200px] p-10 bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 text-white flex flex-col justify-between overflow-hidden relative border-[20px] border-slate-950 shadow-2xl rounded-[3rem]"\n        style={{ boxSizing: 'border-box' }}\n      >`,
  `exportLayout = (\n      <div \n        id="rain-ews-export-module"\n        className="w-[1200px] h-[1200px] p-10 bg-orange-50 text-orange-950 flex flex-col justify-between overflow-hidden relative border-[10px] border-orange-500"\n        style={{ boxSizing: 'border-box' }}\n      >`
);

// Close the exportLayout assignment
// The block ends around line 1592:
/*
      </div>
    );
  }
*/
code = code.replace(
  `\n      </div>\n    );\n  }`,
  `\n      </div>\n    );\n  }`
); // Wait, no, we just change `return (` to `exportLayout = (`. 
// So the `);` is already correct.

// 3. Remove ternaries from main return
code = code.replace(/className=\{\`bg-white border-2 border-orange-200 p-6 flex-1 flex flex-col justify-between overflow-hidden \$\{isExporting \? 'shadow-none' : 'rounded-\[2rem\] shadow-lg border-white\/10'\}\`\}/g, 
  `className="bg-white border border-gray-200 rounded-[2rem] p-6 flex-1 flex flex-col justify-between overflow-hidden shadow-lg"`);
  
code = code.replace(/className=\{\`relative \$\{isExporting \? 'p-10 bg-white border-2 border-orange-200' : 'space-y-6'\}\`\}/g, 
  `className="relative space-y-6"`);

code = code.replace(/className=\{\`relative z-10 \$\{isExporting \? 'space-y-8' : 'space-y-6'\}\`\}/g, 
  `className="relative z-10 space-y-6"`);

code = code.replace(/className=\{\`bg-white border \$\{isExporting \? 'border-2 border-slate-300 shadow-none' : 'border-gray-150'\} p-5 shadow-xs space-y-4 text-left\`\}/g,
  `className="bg-white border border-gray-150 rounded-[2rem] p-5 shadow-xs space-y-4 text-left"`);

code = code.replace(/className=\{\`space-y-4 \$\{isExporting \? 'bg-white p-5 border border-orange-300' : ''\}\`\}/g, 
  `className="space-y-4"`);

code = code.replace(/className=\{\`space-y-4 \$\{isExporting \? 'bg-white p-5 border border-sky-300' : ''\}\`\}/g, 
  `className="space-y-4"`);

// Remove the `isExporting && (...)` blocks that were erroneously added in main screen
code = code.replace(/\{isExporting && \(\s*<>\s*<div className="absolute inset-0 z-0 bg-orange-50" \/>\s*<\/>\s*\)\}/g, '');
code = code.replace(/\{\/\* INFOGRAPHIC HEADER.*?\{isExporting && \([\s\S]*?\{!\!reporterName && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*\)\}/g, ''); // Too complex, I will write manual replace for this.

fs.writeFileSync('src/components/RainDailyEWS.tsx', code);
