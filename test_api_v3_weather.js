async function main() {
  const baseURL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public';
  
  const endpoints = [
    '/weather',
    '/temp',
    '/humidity',
    '/air_temperature',
    '/relative_humidity',
    '/latest_weather',
    '/waterlevel',
    '/rain_24h'
  ];

  for (const ep of endpoints) {
    const url = `${baseURL}${ep}`;
    console.log(`Fetching: ${url}`);
    try {
      const res = await fetch(url);
      console.log(`  Status: ${res.status}`);
      if (res.status === 200) {
        const json = await res.json();
        console.log(`  Keys:`, Object.keys(json));
        if (json.data && Array.isArray(json.data)) {
          console.log(`  Data length: ${json.data.length}`);
          console.log(`  Sample:`, JSON.stringify(json.data.slice(0, 1), null, 2));
        }
      }
    } catch (err) {
      console.error(`  Error:`, err.message);
    }
  }
}

main();
