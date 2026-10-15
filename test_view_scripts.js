import fs from 'fs';
import * as cheerio from 'cheerio';

function main() {
  const html = fs.readFileSync('station_page_v4.html', 'utf8');
  const $ = cheerio.load(html);
  
  const s65 = $('script').eq(65).html();
  const s68 = $('script').eq(68).html();
  
  fs.writeFileSync('script_65.js', s65 || '');
  fs.writeFileSync('script_68.js', s68 || '');
  
  console.log('Saved script_65.js and script_68.js');
}

main();
