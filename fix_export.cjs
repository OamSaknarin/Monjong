const fs = require('fs');
let file = 'src/components/Volunteers.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "          'โรคประจำตัว': v.disease || '-',";
const replacementStr = "          'โรคประจำตัว': v.disease || '-',\n          'น้ำหนัก (กก.)': v.weight || '-',\n          'ส่วนสูง (ซม.)': v.height || '-',\n          'รอบอก (นิ้ว)': v.chest || '-',\n          'ไหล่ (นิ้ว)': v.shoulder || '-',\n          'เอว (นิ้ว)': v.waist || '-',\n          'ต้นขา (นิ้ว)': v.thigh || '-',\n          'ไซต์เสื้อ': v.shirtSize || '-',\n          'ไซต์กางเกง': v.pantsSize || '-',\n          'ไซต์รองเท้า': v.shoeSize || '-',";

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content);
  console.log('Fixed export fields');
}
