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
removeTopButtons('src/components/RelatedWebsites.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingLinkId \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);
