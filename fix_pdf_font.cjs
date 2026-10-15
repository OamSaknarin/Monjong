const fs = require('fs');
let content = fs.readFileSync('src/components/BorrowSlipPdfModal.tsx', 'utf8');

content = content.replace(
  /family=Sarabun:wght@/g,
  'family=Kanit:wght@'
).replace(
  /font-family: 'Sarabun'/g,
  "font-family: 'Kanit'"
);

fs.writeFileSync('src/components/BorrowSlipPdfModal.tsx', content);
