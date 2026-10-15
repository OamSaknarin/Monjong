import fs from 'fs';
import * as cheerio from 'cheerio';

function main() {
  const html = fs.readFileSync('station_page_v4.html', 'utf8');
  const $ = cheerio.load(html);
  
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (nextDataScript) {
    console.log('Found __NEXT_DATA__ script!');
    fs.writeFileSync('next_data.json', nextDataScript);
    console.log('Saved __NEXT_DATA__ to next_data.json');
    const parsed = JSON.parse(nextDataScript);
    console.log('Props keys:', Object.keys(parsed.props || {}));
    if (parsed.props?.pageProps) {
      console.log('PageProps keys:', Object.keys(parsed.props.pageProps));
    }
  } else {
    console.log('__NEXT_DATA__ script not found. Let us search for any JSON script tags.');
    $('script[type="application/json"]').each((idx, el) => {
      console.log(`JSON Script ${idx}: id="${$(el).attr('id')}" class="${$(el).attr('class')}"`);
      const text = $(el).html();
      console.log('Length:', text?.length);
      fs.writeFileSync(`json_script_${idx}.json`, text || '');
    });
    
    // Also search for any large scripts with data
    $('script').each((idx, el) => {
      const text = $(el).html() || '';
      if (text.includes('weather') || text.includes('rain') || text.includes('temperature')) {
        console.log(`Script ${idx} contains weather keywords, length:`, text.length);
      }
    });
  }
}

main();
