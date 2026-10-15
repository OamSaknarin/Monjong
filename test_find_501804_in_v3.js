async function main() {
  const url = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h';
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.data) {
      const found = json.data.find(d => 
        String(d.station?.id) === '501804' || 
        String(d.station?.tele_station_oldcode) === '501804' ||
        JSON.stringify(d).includes('501804')
      );
      console.log('Found 501804 in rain_24h:', !!found);
      if (found) {
        console.log(JSON.stringify(found, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
