import fs from 'fs';

function main() {
  const html = fs.readFileSync('station_page_v4.html', 'utf8');
  let idx = 0;
  let count = 0;
  while ((idx = html.indexOf('501804', idx)) !== -1) {
    console.log(`Occurrence ${count + 1} of 501804 at index ${idx}:`);
    console.log(html.substring(idx - 150, idx + 150));
    console.log('---------------------------------------------------------');
    idx += 6;
    count++;
  }
}

main();
