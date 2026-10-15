const fs = require('fs');
let file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

const fontFaceStr = `
@font-face {
  font-family: 'THSarabunNew';
  src: url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@3/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'THSarabunNew';
  src: url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@3/fonts/THSarabunNew/THSarabunNew-Bold.woff2') format('woff2');
  font-weight: bold;
  font-style: normal;
}

@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
`;

content = content.replace("@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');", fontFaceStr);

const themeTarget = `@theme {
  --font-sans: "Kanit", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Kanit", sans-serif;
  --font-mitr: "Kanit", sans-serif;
  --font-mono: "Kanit", ui-monospace, SFMono-Regular, monospace;
}`;

const newTheme = `@theme {
  --font-sans: "Kanit", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Kanit", sans-serif;
  --font-mitr: "Kanit", sans-serif;
  --font-mono: "Kanit", ui-monospace, SFMono-Regular, monospace;
  --font-sarabun: "THSarabunNew", sans-serif;
}`;

content = content.replace(themeTarget, newTheme);

fs.writeFileSync(file, content);
console.log('Updated index.css');
