const fs = require('fs');
let file = 'src/types.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('weight?: string')) {
  content = content.replace(
    '  bloodGroup: string; // กรุ๊ปเลือด',
    '  bloodGroup: string; // กรุ๊ปเลือด\n  weight?: string; // น้ำหนัก\n  height?: string; // ส่วนสูง\n  chest?: string; // รอบอก\n  shoulder?: string; // ไหล่\n  waist?: string; // เอว\n  thigh?: string; // ต้นขา\n  shirtSize?: string; // ไซต์เสื้อ\n  pantsSize?: string; // ไซต์กางเกง\n  shoeSize?: string; // ไซต์รองเท้า'
  );
  fs.writeFileSync(file, content);
  console.log('Fixed types.ts');
}
