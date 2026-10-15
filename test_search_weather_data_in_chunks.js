import fs from 'fs';

function main() {
  const content = fs.readFileSync('script_68.js', 'utf8');
  console.log('script_68.js length:', content.length);

  // Search for "temperature" or "humid"
  const keys = ['temp', 'humid', 'rain', 'water', 'weather', '501804', '17.42006', '98.49000'];
  keys.forEach(k => {
    let idx = 0;
    let count = 0;
    while ((idx = content.indexOf(k, idx)) !== -1) {
      count++;
      idx += k.length;
    }
    console.log(`- "${k}": ${count} occurrences`);
  });

  // Let's print some occurrences of weather
  let idx = 0;
  for (let i = 0; i < 5; i++) {
    idx = content.indexOf('weather', idx);
    if (idx === -1) break;
    console.log(`Occurrence ${i+1} of "weather":`);
    console.log(content.substring(idx - 100, idx + 100));
    console.log('---');
    idx += 7;
  }
}

main();
