import fs from 'fs';
import * as cheerio from 'cheerio';

async function main() {
  console.log('Fetching Mon Jong page...');
  const res = await fetch('https://twa.thaiwater.net/th/map/basic/multiple-layers/%E0%B8%A1%E0%B9%88%E0%B8%AD%E0%B8%99%E0%B8%88%E0%B8%AD%E0%B8%87/501804?ds=rr%2Csc%2Cwt&p=modal&c=98.49000%2C17.42006%2C9.433z', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  const html = await res.text();
  fs.writeFileSync('station_page_v4.html', html);
  console.log('HTML saved to station_page_v4.html. Length:', html.length);
  
  const $ = cheerio.load(html);
  
  console.log('\n--- Script tags ---');
  $('script').each((idx, el) => {
    const src = $(el).attr('src');
    const content = $(el).html();
    const type = $(el).attr('type');
    
    console.log(`Script ${idx}: src=${src || 'none'}, type=${type || 'none'}, length=${content ? content.length : 0}`);
    if (content && content.includes('501804')) {
      console.log(`  -> FOUND 501804 in script content!`);
      fs.writeFileSync(`script_501804_${idx}.js`, content);
    }
    if (content && content.includes('ม่อนจอง')) {
      console.log(`  -> FOUND ม่อนจอง in script content!`);
    }
  });

  console.log('\n--- Searching body for 501804 ---');
  let bodyText = $('body').text();
  console.log('Body contains 501804:', bodyText.includes('501804'));
  console.log('Body contains ม่อนจอง:', bodyText.includes('ม่อนจอง'));
}

main().catch(err => console.error(err));
