import fs from 'fs';

function run() {
  const html = fs.readFileSync('station_page.html', 'utf8');
  const payload = fs.readFileSync('next_payload.txt', 'utf8');
  
  console.log('Search in raw HTML:');
  let idx = html.indexOf('2026-07');
  while (idx !== -1) {
    console.log(`Found "2026-07" at ${idx}:`, html.substring(idx - 100, idx + 100));
    idx = html.indexOf('2026-07', idx + 1);
  }
  
  console.log('\nSearch in payload:');
  idx = payload.indexOf('2026-07');
  while (idx !== -1) {
    console.log(`Found "2026-07" in payload at ${idx}:`, payload.substring(idx - 100, idx + 100));
    idx = payload.indexOf('2026-07', idx + 1);
  }
}
run();
