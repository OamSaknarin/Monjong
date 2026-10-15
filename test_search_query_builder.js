import fs from 'fs';

function main() {
  const text = fs.readFileSync('chunk_3e39a03645299b34.js', 'utf8');
  
  let idx = text.indexOf('/v2/weather/list');
  if (idx !== -1) {
    console.log('--- Context of /v2/weather/list ---');
    console.log(text.substring(idx - 200, idx + 800));
  } else {
    console.log('/v2/weather/list not found');
  }

  // Let's also look for all endpoints starting with /v2/weather/
  console.log('\n--- Searching for endpoints in the form /v2/weather/ ---');
  let regex = /\/v2\/weather\/[a-zA-Z_]+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    console.log(match[0]);
  }
}

main();
