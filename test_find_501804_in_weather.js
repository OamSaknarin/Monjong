import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_weather_stations.json', 'utf8');
  console.log('Is 501804 in all_weather_stations.json:', content.includes('501804'));
}

main();
