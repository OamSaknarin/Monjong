const fs = require('fs');
let file = 'src/components/Volunteers.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `      const doc = new jsPDF();
      doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf", "Roboto", "normal");
      doc.setFont("Roboto");`;

const new1 = `      const doc = new jsPDF();
      doc.addFont("https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@3/fonts/THSarabunNew/THSarabunNew.ttf", "THSarabunNew", "normal");
      doc.setFont("THSarabunNew");`;

const target2 = `      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        styles: { font: "Roboto" }
      });`;

const new2 = `      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        styles: { font: "THSarabunNew" }
      });`;

let changed = false;
if (content.includes(target1)) {
  content = content.replace(target1, new1);
  changed = true;
}
if (content.includes(target2)) {
  content = content.replace(target2, new2);
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, content);
  console.log('Fixed Volunteers.tsx');
} else {
  console.log('Targets not found');
}
