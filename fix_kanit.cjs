const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

// Replace the Google Fonts import
content = content.replace(
  /@import url\([^)]+\);/,
  `@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');`
);

// Replace font definitions
content = content.replace(
  /--font-sans: [^;]+;/,
  `--font-sans: "Kanit", ui-sans-serif, system-ui, sans-serif;`
).replace(
  /--font-heading: [^;]+;/,
  `--font-heading: "Kanit", sans-serif;`
).replace(
  /--font-mitr: [^;]+;/,
  `--font-mitr: "Kanit", sans-serif;`
).replace(
  /--font-mono: [^;]+;/,
  `--font-mono: "Kanit", ui-monospace, SFMono-Regular, monospace;`
);

fs.writeFileSync('src/index.css', content);
