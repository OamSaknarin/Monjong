const fs = require('fs');
const glob = require('glob'); // Note: we might not have glob, but we can use fs.readdirSync or child_process
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // A regex to match the top buttons block which looks like:
  // <div className="flex items-center gap-2.5 w-full sm:w-auto">
  //   <button ...> ยกเลิก </button>
  //   <button ...> ... </button>
  // </div>
  // That comes right before </div>\s*<form
  
  // Actually, there's another way: The top buttons are inside a flex div which is the 2nd child of the header div.
  // We can just find the `<div className="flex items-center gap-2.5 w-full sm:w-auto">` and check if it's followed by `</div>\s*<form`
  // Wait, the outer div is:
  // <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
  //   <div className="flex items-center gap-3">...</div>
  //   <div className="flex items-center gap-2.5 w-full sm:w-auto">...</div>
  // </div>
  // <form>
  
  let newContent = content.replace(
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">[\s\S]*?<\/div>\s*<\/div>\s*<form/g,
    '</div>\n          <form'
  );
  
  // Also check if there are other classes
  newContent = newContent.replace(
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">[\s\S]*?<\/div>\s*<\/div>\s*<(?:div className="space-y-6"|div className="grid|form)/g,
    match => {
        if(match.includes('ยกเลิก') && match.includes('บันทึก')) {
             let replacement = match.substring(match.lastIndexOf('</div>\n') + 7);
             if (replacement.startsWith('</div')) {
                 replacement = match.substring(match.indexOf('</div>\n', match.lastIndexOf('</div>\n') - 10) + 7); // hacky
             }
             // Actually let's just use a simpler regex
             return match; // fallback
        }
        return match;
    }
  );

}
