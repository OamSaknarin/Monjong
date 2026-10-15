async function main() {
  const url = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h';
  console.log(`Fetching: ${url}`);
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log('Status:', res.status);
    
    // Check structure of json
    console.log('Keys of json:', Object.keys(json));
    
    // Find our station 501804
    // Usually the data is in an array or nested object. Let's find "501804" or "ม่อนจอง" recursively in the object
    const findStation = (obj, key) => {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findStation(item, key);
          if (found) return found;
        }
      } else {
        if (obj.station_code === '501804' || obj.station_id === 501804 || obj.id === '501804') {
          return obj;
        }
        for (const k in obj) {
          const found = findStation(obj[k], key);
          if (found) return found;
        }
      }
      return null;
    };
    
    const station = findStation(json);
    if (station) {
      console.log('Found Station 501804 in rain_24h response:');
      console.log(JSON.stringify(station, null, 2));
    } else {
      console.log('Station 501804 not found in rain_24h response.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
