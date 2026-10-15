const fs = require('fs');
let file = 'src/components/Volunteers.tsx';
let content = fs.readFileSync(file, 'utf8');

// I will just restore the closing divs.
content = content.replace(
  '            {/* 1.5 สัดส่วนร่างกาย (สีชมพู Pink) */}',
  '              </div>\n            </div>\n\n            {/* 1.5 สัดส่วนร่างกาย (สีชมพู Pink) */}'
);

fs.writeFileSync(file, content);
console.log('Fixed syntax error 2');
