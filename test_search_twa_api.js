import fs from 'fs';

async function main() {
  const url = 'https://twa.thaiwater.net/_next/static/chunks/3e39a03645299b34.js';
  const res = await fetch(url);
  const text = await res.text();
  
  fs.writeFileSync('chunk_3e39a03645299b34.js', text);
  console.log('Saved chunk to chunk_3e39a03645299b34.js');

  // Search for any string starting with twa-api-public
  let idx = 0;
  let count = 0;
  while ((idx = text.indexOf('twa-api-public.thaiwater.net', idx)) !== -1) {
    console.log(`Match ${count + 1} at index ${idx}:`);
    console.log(text.substring(idx - 100, idx + 200));
    console.log('---------------------------------------------------------');
    idx += 25;
    count++;
  }
}

main().catch(err => console.error(err));
