import fs from 'fs';
import * as cheerio from 'cheerio';

function main() {
  const html = fs.readFileSync('station_page_v4.html', 'utf8');
  const $ = cheerio.load(html);
  
  // Script 68 is the one with length 105819. Let's find it.
  let script68Content = '';
  $('script').each((idx, el) => {
    const content = $(el).html() || '';
    if (content.length > 100000) {
      script68Content = content;
      console.log(`Found large script at index ${idx}, length: ${content.length}`);
    }
  });

  if (!script68Content) {
    console.log('Large script not found!');
    return;
  }

  // Let's search for keywords
  const keywords = ['501804', 'ม่อนจอง', 'อมก๋อย', 'temp', 'rain', 'humidity', 'อุณหภูมิ', 'ความชื้น', 'ฝน'];
  keywords.forEach(kw => {
    const count = (script68Content.match(new RegExp(kw, 'g')) || []).length;
    console.log(`Keyword "${kw}" count: ${count}`);
  });

  // Let's print occurrences of "501804" in context (first 3 occurrences)
  let idx = script68Content.indexOf('501804');
  let matchCount = 0;
  while (idx !== -1 && matchCount < 10) {
    console.log(`Occurrence ${matchCount + 1} at index ${idx}:`);
    console.log(script68Content.substring(idx - 200, idx + 200));
    console.log('--------------------------------------------');
    idx = script68Content.indexOf('501804', idx + 1);
    matchCount++;
  }
}

main();
