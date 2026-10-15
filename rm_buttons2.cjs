const fs = require('fs');

function removeTopButtons(file, targetRegexes) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for (const regex of targetRegexes) {
        content = content.replace(regex, '');
    }
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Modified', file);
    }
}

// Expenses.tsx
removeTopButtons('src/components/Expenses.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingExpenseId \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// OfficialDocs.tsx
removeTopButtons('src/components/OfficialDocs.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingDocId \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// RelatedWebsites.tsx
removeTopButtons('src/components/RelatedWebsites.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingSiteId \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// MonJongLocations.tsx
removeTopButtons('src/components/MonJongLocations.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingLocId \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

