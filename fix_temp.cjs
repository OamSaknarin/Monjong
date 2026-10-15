const fs = require('fs');
let content = fs.readFileSync('src/components/RainDailyEWS.tsx', 'utf-8');

const target = /const fetchTemperature = async \(\) => \{[\s\S]*?setInterval\(fetchTemperature, 15 \* 60 \* 1000\);\n\s*return \(\) => clearInterval\(tempTimer\);\n\s*\}, \[\]\);/;

content = content.replace(target, `// Temperature fetching removed`);

fs.writeFileSync('src/components/RainDailyEWS.tsx', content, 'utf-8');
console.log("Removed unused fetchTemperature code.");
