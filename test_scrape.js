import fs from 'fs';

async function testStationPage() {
  const url = 'https://twa.thaiwater.net/th/map/basic/multiple-layers/%E0%B8%A1%E0%B9%88%E0%B8%AD%E0%B8%99%E0%B8%88%E0%B8%AD%E0%B8%87/501804?ds=rr%2Csc%2Cwt&p=modal&c=98.49000%2C17.42006%2C9.433z';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const text = await res.text();
    console.log(`Length: ${text.length}`);
    fs.writeFileSync('station_page.html', text);
    
    // Let's search for "501804" in the HTML file
    const index = text.indexOf('501804');
    if (index !== -1) {
      console.log('Found "501804" at index:', index);
      console.log('Surrounding text:', text.substring(index - 200, index + 200));
    } else {
      console.log('Did not find "501804" in raw HTML.');
    }
  } catch (err) {
    console.error(err);
  }
}
testStationPage();
