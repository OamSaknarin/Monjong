const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  let newContent = content
    .replace(/placeholder="ค้นหาชื่อไฟล์..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหาชื่อ, ชื่อเล่น, ตำแหน่ง, เบอร์โทร..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหาสถานที่..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหา เลขที่, เรื่อง, หน่วยงาน, หรือ แฟ้ม..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหาชื่อ หรือรหัสประจำตัว..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหารายละเอียด..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหาหมายเลขครุภัณฑ์, รายการ หรือผู้ยืม..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหารายการ, หมวดหมู่, หรือผู้เบิก..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหาชื่องาน..."/g, 'placeholder="ค้นหา..."')
    .replace(/placeholder="ค้นหา..."/g, 'placeholder="ค้นหา..."'); // dummy to apply

  if (content !== newContent) {
    fs.writeFileSync(path.join(dir, file), newContent);
    console.log('Modified', file);
  }
}
