const fs = require('fs');
const path = require('path');

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

// EquipmentBorrow.tsx
removeTopButtons('src/components/EquipmentBorrow.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingEqId \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/,
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingBorrowId \? 'บันทึกการแก้ไข' : 'อนุมัติการยืม'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// EmployeeInfo.tsx
removeTopButtons('src/components/EmployeeInfo.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingEmpId \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// Expenses.tsx
removeTopButtons('src/components/Expenses.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingExpense \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// OfficialDocs.tsx
removeTopButtons('src/components/OfficialDocs.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingDoc \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// RelatedWebsites.tsx
removeTopButtons('src/components/RelatedWebsites.tsx', [
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?\{editingSite \? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'\}[\s\S]*?<\/button>\s*<\/div>/
]);

// RainDailyEWS.tsx - check if there are top buttons
// We will look at it later if it doesn't match

// Volunteers.tsx
removeTopButtons('src/components/Volunteers.tsx', [
    /<div className="flex gap-2">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?บันทึก[\s\S]*?<\/button>\s*<\/div>/,
    /<div className="flex items-center gap-2\.5 w-full sm:w-auto">\s*<button[\s\S]*?ยกเลิก[\s\S]*?<\/button>\s*<button[\s\S]*?บันทึกข้อมูล[\s\S]*?<\/button>\s*<\/div>/
]);

