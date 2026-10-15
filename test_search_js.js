import fs from 'fs';

function main() {
  const content = fs.readFileSync('chunk_3e39a03645299b34.js', 'utf8');
  
  // Find "MAP:" in the code and print context around it
  let idx = 0;
  while ((idx = content.indexOf('MAP:', idx)) !== -1) {
    console.log(`Occurrence of MAP: at index ${idx}:`);
    console.log(content.substring(idx - 150, idx + 250));
    console.log('----------------------------------------------------');
    idx += 4;
  }
}

main();
