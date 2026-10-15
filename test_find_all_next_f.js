import fs from 'fs';
import * as cheerio from 'cheerio';

function main() {
  const html = fs.readFileSync('station_page_v4.html', 'utf8');
  const $ = cheerio.load(html);
  
  let allNextF = [];
  $('script').each((idx, el) => {
    const content = $(el).html() || '';
    if (content.includes('__next_f.push')) {
      allNextF.push({ idx, content });
    }
  });

  console.log(`Found ${allNextF.length} __next_f.push scripts.`);
  
  // Let's write all __next_f.push script contents to a single text file to inspect
  let output = '';
  allNextF.forEach((s, index) => {
    output += `\n\n=== Script ${s.idx} (length ${s.content.length}) ===\n`;
    output += s.content;
  });
  
  fs.writeFileSync('all_next_f.txt', output);
  console.log('Saved all __next_f.push script contents to all_next_f.txt');

  // Let's search for some numbers and keys in all_next_f.txt
  // Let's search for "rain", "temp", "humidity", "rh", "value" (case insensitive)
  const fileContent = output.toLowerCase();
  console.log('Occurrences of "temp":', (fileContent.match(/temp/g) || []).length);
  console.log('Occurrences of "rain":', (fileContent.match(/rain/g) || []).length);
  console.log('Occurrences of "humid":', (fileContent.match(/humid/g) || []).length);
  console.log('Occurrences of "air":', (fileContent.match(/air/g) || []).length);
  console.log('Occurrences of "water":', (fileContent.match(/water/g) || []).length);
}

main();
