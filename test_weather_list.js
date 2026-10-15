import fs from 'fs';

async function main() {
  const url = 'https://twa-api-public.thaiwater.net/v2/weather/list';
  const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
  
  console.log('Fetching weather list...');
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'x-api-key': apiKey
    }
  });
  
  const json = await res.json();
  fs.writeFileSync('weather_list.json', JSON.stringify(json, null, 2));
  console.log('Saved to weather_list.json. Total items/keys:', Object.keys(json));

  if (Array.isArray(json.data)) {
    console.log(`data is an array of length ${json.data.length}`);
    
    // Let's filter for Chiang Mai
    const chiangMai = json.data.filter(item => {
      const provTh = item.geocode?.province_name?.th || '';
      const provEn = item.geocode?.province_name?.en || '';
      return provTh.includes('เชียงใหม่') || provEn.toLowerCase().includes('chiang mai');
    });
    
    console.log(`Found ${chiangMai.length} weather stations in Chiang Mai.`);
    
    // Search for Mon Jong or Omkoi
    const omkoi = chiangMai.filter(item => {
      const name = item.name?.th || item.name?.en || '';
      const sub = item.geocode?.tumbon_name?.th || '';
      const dist = item.geocode?.amphoe_name?.th || '';
      return name.includes('อมก๋อย') || name.includes('ม่อนจอง') || sub.includes('ม่อนจอง') || dist.includes('อมก๋อย');
    });
    
    console.log(`Found ${omkoi.length} stations in Omkoi/Mon Jong area:`);
    omkoi.forEach((st, idx) => {
      console.log(`Station ${idx+1}:`);
      console.log(JSON.stringify(st, null, 2));
    });

  } else {
    console.log('data is not an array.');
  }
}

main().catch(err => console.error(err));
