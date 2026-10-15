async function main() {
  const baseURL = 'https://twa-api-public.thaiwater.net';
  const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
  
  const endpoints = [
    '/v2/weather'
  ];

  for (const ep of endpoints) {
    const url = `${baseURL}${ep}`;
    console.log(`Fetching: ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0',
          'x-api-key': apiKey
        }
      });
      console.log(`  Status: ${res.status}`);
      const text = await res.text();
      console.log(`  Response (first 1000 chars):`, text.substring(0, 1000));
      if (res.status === 200) {
        const json = JSON.parse(text);
        if (json.data && Array.isArray(json.data)) {
          console.log(`  Data length: ${json.data.length}`);
          console.log(`  Sample item:`, JSON.stringify(json.data[0], null, 2));
          
          // Let's search for Chiang Mai or Omkoi or Mon Jong
          const cm = json.data.filter(st => {
            const name = st.station?.tele_station_name?.th || st.station?.station || '';
            const prov = st.geocode?.province_name?.th || st.geoCode?.province || '';
            const dist = st.geocode?.amphoe_name?.th || st.geoCode?.district || '';
            const sub = st.geocode?.tumbon_name?.th || st.geoCode?.subdistrict || '';
            return prov.includes('เชียงใหม่') || name.includes('ม่อนจอง') || name.includes('อมก๋อย') || dist.includes('อมก๋อย') || sub.includes('ม่อนจอง');
          });
          console.log(`  Matches in Chiang Mai/Omkoi/Mon Jong: ${cm.length}`);
          if (cm.length > 0) {
            console.log(`  Sample matches:`, JSON.stringify(cm.slice(0, 3), null, 2));
          }
        }
      }
      console.log('------------------------------------------------------');
    } catch (err) {
      console.error(`  Error:`, err.message);
    }
  }
}

main();
