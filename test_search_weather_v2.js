import fs from 'fs';

async function main() {
  const baseURL = 'https://twa-api-public.thaiwater.net';
  const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
  const url = `${baseURL}/v2/weather`;
  
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        'x-api-key': apiKey
      }
    });
    console.log(`Status: ${res.status}`);
    const json = await res.json();
    
    fs.writeFileSync('weather_v2_response.json', JSON.stringify(json, null, 2));
    console.log('Saved response to weather_v2_response.json');

    // Let's search the JSON object for '501804' or 'ม่อนจอง' recursively
    const searchString = JSON.stringify(json);
    console.log('Does response contain "501804"?', searchString.includes('501804'));
    console.log('Does response contain "ม่อนจอง"?', searchString.includes('ม่อนจอง') || searchString.includes('%E0%B8%A1%E0%B9%88%E0%B8%AD%E0%B8%99%E0%B8%88%E0%B8%AD%E0%B8%87'));
    
    // Find stations around Chiang Mai province code '50'
    console.log('Does response contain "เชียงใหม่" or province code "50"?');
    let cmCount = 0;
    const findChiangMai = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(findChiangMai);
      } else {
        if (obj.provinceCode === '50' || obj.province === 'เชียงใหม่' || obj.province_name?.th === 'เชียงใหม่') {
          cmCount++;
          if (cmCount <= 5) {
            console.log('Sample Chiang Mai weather station:', JSON.stringify(obj, null, 2));
          }
        }
        for (const k in obj) {
          findChiangMai(obj[k]);
        }
      }
    };
    findChiangMai(json);
    console.log(`Total Chiang Mai stations found: ${cmCount}`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
