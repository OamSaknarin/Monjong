import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_weather_stations.json', 'utf8');
  const stations = JSON.parse(content);
  
  const latMJ = 17.42006;
  const lngMJ = 98.49000;
  
  const mapped = stations.map(st => {
    const lat = parseFloat(st.station?.latitude) || 0;
    const lng = parseFloat(st.station?.longitude) || 0;
    const dist = Math.sqrt(Math.pow(lat - latMJ, 2) + Math.pow(lng - lngMJ, 2));
    return { ...st, dist };
  }).sort((a, b) => a.dist - b.dist);

  console.log('Nearest 10 weather stations to Mon Jong:');
  mapped.slice(0, 10).forEach((st, idx) => {
    console.log(`${idx+1}: ${st.station?.station} (${st.station?.stationCode}) in subdistrict ${st.geoCode?.subdistrict}, district ${st.geoCode?.district}, province ${st.geoCode?.province}`);
    console.log(`   Dist: ${st.dist.toFixed(4)}, Temp: ${st.temperature?.measureValue}°C, Humid: ${st.humid?.measureValue}%, Lat: ${st.station?.latitude}, Lng: ${st.station?.longitude}`);
  });
}

main();
