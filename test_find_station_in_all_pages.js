import fs from 'fs';

async function fetchPage(page) {
  const url = `https://twa-api-public.thaiwater.net/v2/weather/list?page=${page}`;
  const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        'x-api-key': apiKey
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('Fetching all weather pages to find Omkoi / Mon Jong stations...');
  
  let allStations = [];
  
  // Fetch pages in batches
  const batchSize = 15;
  const totalPages = 192;
  
  for (let i = 1; i <= totalPages; i += batchSize) {
    const promises = [];
    for (let j = i; j < i + batchSize && j <= totalPages; j++) {
      promises.push(fetchPage(j));
    }
    const results = await Promise.all(promises);
    results.forEach(res => {
      if (res) allStations.push(...res);
    });
    console.log(`Fetched pages up to ${Math.min(i + batchSize - 1, totalPages)}. Total stations collected: ${allStations.length}`);
  }

  fs.writeFileSync('all_weather_stations.json', JSON.stringify(allStations, null, 2));
  console.log('Saved all stations to all_weather_stations.json');

  // Search for stations in Chiang Mai
  const cm = allStations.filter(st => {
    const prov = st.geoCode?.province || '';
    return prov.includes('เชียงใหม่') || st.geoCode?.provinceCode === '50';
  });
  console.log(`Total weather stations in Chiang Mai: ${cm.length}`);

  // Search for Omkoi / Mon Jong
  const omkoi = cm.filter(st => {
    const name = st.station?.station || '';
    const dist = st.geoCode?.district || '';
    const sub = st.geoCode?.subdistrict || '';
    return name.includes('อมก๋อย') || name.includes('ม่อนจอง') || dist.includes('อมก๋อย') || sub.includes('ม่อนจอง');
  });

  console.log(`Omkoi / Mon Jong weather stations count: ${omkoi.length}`);
  if (omkoi.length > 0) {
    console.log('Omkoi / Mon Jong weather stations:');
    console.log(JSON.stringify(omkoi, null, 2));
  } else {
    console.log('No direct weather stations found in Omkoi/Mon Jong. Let us find the nearest Chiang Mai weather stations to Mon Jong (lat: 17.42006, lng: 98.49000)');
    // Calculate distance to Mon Jong
    const latMJ = 17.42006;
    const lngMJ = 98.49000;
    
    const sorted = cm.map(st => {
      const lat = parseFloat(st.station?.latitude) || 0;
      const lng = parseFloat(st.station?.longitude) || 0;
      const dist = Math.sqrt(Math.pow(lat - latMJ, 2) + Math.pow(lng - lngMJ, 2));
      return { ...st, dist };
    }).sort((a, b) => a.dist - b.dist);

    console.log('Nearest 5 weather stations to Mon Jong in Chiang Mai:');
    sorted.slice(0, 5).forEach((st, idx) => {
      console.log(`${idx+1}: ${st.station?.station} (Code: ${st.station?.stationCode}), Dist: ${st.dist.toFixed(4)}, Temp: ${st.temperature?.measureValue}, Humid: ${st.humid?.measureValue}, Lat: ${st.station?.latitude}, Lng: ${st.station?.longitude}`);
    });
  }
}

main().catch(err => console.error(err));
