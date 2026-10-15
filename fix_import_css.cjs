const fs = require('fs');
let file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');",
  ""
);

content = "@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');\n" + content;

fs.writeFileSync(file, content);
console.log('Fixed index.css import order');
