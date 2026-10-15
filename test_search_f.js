import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_next_f.txt', 'utf8');
  
  // Find "temp"
  let idx = 0;
  console.log('--- Matches for "temp" ---');
  let matchCount = 0;
  while ((idx = content.indexOf('temp', idx)) !== -1 && matchCount < 15) {
    console.log(`Match ${matchCount+1} at index ${idx}:`, content.substring(idx - 60, idx + 100));
    idx += 4;
    matchCount++;
  }

  // Find "humid"
  idx = 0;
  console.log('\n--- Matches for "humid" ---');
  matchCount = 0;
  while ((idx = content.indexOf('humid', idx)) !== -1 && matchCount < 15) {
    console.log(`Match ${matchCount+1} at index ${idx}:`, content.substring(idx - 60, idx + 100));
    idx += 5;
    matchCount++;
  }

  // Find "rain"
  idx = 0;
  console.log('\n--- Matches for "rain" ---');
  matchCount = 0;
  while ((idx = content.indexOf('rain', idx)) !== -1 && matchCount < 15) {
    console.log(`Match ${matchCount+1} at index ${idx}:`, content.substring(idx - 60, idx + 100));
    idx += 4;
    matchCount++;
  }
}

main();
