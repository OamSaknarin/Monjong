import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_next_f.txt', 'utf8');
  let idx = 0;
  let count = 0;
  while ((idx = content.indexOf('501804', idx)) !== -1) {
    console.log(`Occurrence ${count+1} of 501804 in all_next_f.txt at index ${idx}:`);
    console.log(content.substring(idx - 150, idx + 150));
    console.log('----------------------------------------------------');
    idx += 6;
    count++;
  }
}

main();
