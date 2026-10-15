const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  let newContent = content.replace(/<span>ส่งออก Excel<\/span>/g, '<span>Excel</span>');
  
  if (content !== newContent) {
    fs.writeFileSync(path.join(dir, file), newContent);
    console.log('Modified', file);
  }
}
