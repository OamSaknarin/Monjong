const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // Replace all placeholder="ค้นหา..." to placeholder="ค้นหา"
  content = content.replace(/placeholder="ค้นหา\.\.\."/g, 'placeholder="ค้นหา"');
  
  // Also find search inputs that have placeholder="" and change them to "ค้นหา"
  // Look for something like:
  // <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
  // <input ... placeholder="" ... />
  // We can just regex for placeholder="" when it's next to search things, or we can just replace specifically for the files.
  
  // EquipmentBorrow.tsx:1238
  // Expenses.tsx:430
  if (file === 'EquipmentBorrow.tsx') {
    content = content.replace(/value=\{searchQuery\}[\s\n]*onChange=\{\(e\) => setSearchQuery\(e.target.value\)\}[\s\n]*placeholder=""/, 'value={searchQuery}\n                  onChange={(e) => setSearchQuery(e.target.value)}\n                  placeholder="ค้นหา"');
  }
  
  if (file === 'Expenses.tsx') {
    content = content.replace(/value=\{searchTerm\}[\s\n]*onChange=\{\(e\) => setSearchTerm\(e.target.value\)\}[\s\n]*placeholder=""/, 'value={searchTerm}\n            onChange={(e) => setSearchTerm(e.target.value)}\n            placeholder="ค้นหา"');
  }
  
  // TaskSchedule.tsx doesn't seem to have search? Let's check RelatedWebsites.tsx.
  if (file === 'RelatedWebsites.tsx') {
      content = content.replace(/value=\{searchQuery\}[\s\n]*onChange=\{\(e\) => setSearchQuery\(e.target.value\)\}[\s\n]*placeholder=".*?"/, 'value={searchQuery}\n                  onChange={(e) => setSearchQuery(e.target.value)}\n                  placeholder="ค้นหา"');
  }
  
  // Check TaskSchedule.tsx
  if (file === 'TaskSchedule.tsx') {
      content = content.replace(/value=\{searchTerm\}[\s\n]*onChange=\{\(e\) => setSearchTerm\(e.target.value\)\}[\s\n]*placeholder=".*?"/, 'value={searchTerm}\n            onChange={(e) => setSearchTerm(e.target.value)}\n            placeholder="ค้นหา"');
      content = content.replace(/value=\{searchQuery\}[\s\n]*onChange=\{\(e\) => setSearchQuery\(e.target.value\)\}[\s\n]*placeholder=".*?"/, 'value={searchQuery}\n                  onChange={(e) => setSearchQuery(e.target.value)}\n                  placeholder="ค้นหา"');
  }

  if (content !== fs.readFileSync(path.join(dir, file), 'utf8')) {
    fs.writeFileSync(path.join(dir, file), content);
    console.log('Modified', file);
  }
}
