async function main() {
  const baseURL = 'https://twa-api-public.thaiwater.net';
  const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
  
  const endpoints = [
    '/data/platform/v1/public/latest_weather_area',
    '/data/platform/v1/public/latest_weather_area_daily'
  ];

  for (const endpoint of endpoints) {
    const url = `${baseURL}${endpoint}`;
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
      console.log(`  Response (first 500 chars):`, text.substring(0, 500));
      console.log('------------------------------------------------------');
    } catch (err) {
      console.error(`  Error:`, err.message);
    }
  }
}

main();
