const fs = require('fs');
let file = 'src/components/Volunteers.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '                </div>\n            </div>\n              </div>\n            </div>\n\n            {/* 1.5 สัดส่วนร่างกาย (สีชมพู Pink) */}',
  '                </div>\n              </div>\n            </div>\n\n            {/* 1.5 สัดส่วนร่างกาย (สีชมพู Pink) */}'
);

fs.writeFileSync(file, content);
console.log('Fixed syntax error 4');
