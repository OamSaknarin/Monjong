import fs from 'fs';
import * as cheerio from 'cheerio';

function main() {
  const html = fs.readFileSync('station_page_v4.html', 'utf8');
  const $ = cheerio.load(html);
  
  // Search for any element text containing "อุณหภูมิ" or "ความชื้น" or numbers
  const text = $('body').text();
  console.log('Total text length:', text.length);
  
  // Let's search for "อุณหภูมิ" in the text
  let idx = 0;
  console.log('=== Occurrences of อุณหภูมิ in body text ===');
  while ((idx = text.indexOf('อุณหภูมิ', idx)) !== -1) {
    console.log(text.substring(idx - 50, idx + 100));
    console.log('-------------------------------------------');
    idx += 8;
  }
}

main();
