import fs from 'fs';

function main() {
  const text = fs.readFileSync('chunk_3e39a03645299b34.js', 'utf8');
  
  // Search for interceptors or token injection
  let idx = 0;
  let count = 0;
  console.log('--- Matches for interceptor ---');
  while ((idx = text.indexOf('interceptors', idx)) !== -1 && count < 10) {
    console.log(`Match ${count+1} at index ${idx}:`, text.substring(idx - 150, idx + 250));
    console.log('--------------------------------------------');
    idx += 12;
    count++;
  }

  // Search for Authorization headers
  idx = 0;
  count = 0;
  console.log('\n--- Matches for Authorization or Token ---');
  while ((idx = text.indexOf('Authorization', idx)) !== -1 && count < 10) {
    console.log(`Match ${count+1} at index ${idx}:`, text.substring(idx - 100, idx + 100));
    console.log('--------------------------------------------');
    idx += 13;
    count++;
  }
}

main();
