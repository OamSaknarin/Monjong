import fs from 'fs';

function main() {
  const content = fs.readFileSync('chunk_3e39a03645299b34.js', 'utf8');
  console.log('chunk_3e39a03645299b34.js length:', content.length);
  
  // Find all strings starting with /v2/ or /data/
  const regex = /["'](\/(?:v2|data|api)\/[^"']+)["']/g;
  const matches = [...new Set([...content.matchAll(regex)].map(m => m[1]))];
  
  console.log(`Found ${matches.length} matches:`);
  console.log(matches.slice(0, 50));
  
  // Search for x-api-key or key
  console.log('Includes x-api-key:', content.includes('x-api-key'));
  console.log('Includes TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x:', content.includes('TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x'));
}

main();
