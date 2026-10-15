import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_weather_stations.json', 'utf8');
  const stations = JSON.parse(content);
  
  const provinces = [...new Set(stations.map(st => st.geoCode?.province || 'UNKNOWN'))].sort();
  console.log('All unique provinces in the weather API:');
  console.log(provinces);
}

main();
