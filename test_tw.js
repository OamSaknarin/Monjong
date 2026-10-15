const endpoints = [
  'weather_station',
  'weather_stations',
  'tele_station',
  'tele_stations',
  'station',
  'stations'
];

async function run() {
  for (const ep of endpoints) {
    try {
      const url = `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/${ep}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const text = await res.text();
      console.log(`Endpoint: ${ep} -> Status: ${res.status}, Length: ${text.length}, Prefix: ${text.substring(0, 50)}`);
    } catch (err) {
      console.log(`Endpoint: ${ep} -> Error:`, err.message);
    }
  }
}
run();
