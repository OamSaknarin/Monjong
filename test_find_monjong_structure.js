import fs from 'fs';

function main() {
  const json = JSON.parse(fs.readFileSync('weather_v2_response.json', 'utf8'));
  
  // The data structure of /v2/weather is an object of groups (like "10", "50" etc.)
  // We can search for the station ID/code in all features
  let foundFeature = null;
  let foundGroupKey = null;

  for (const groupKey in json.data) {
    const group = json.data[groupKey];
    if (group.features) {
      const f = group.features.find(feat => 
        feat.properties?.id === '501804' || 
        feat.properties?.station?.id === '501804' ||
        feat.properties?.station?.id === 501804 ||
        feat.properties?.station?.stationCode === '501804' ||
        JSON.stringify(feat).includes('501804')
      );
      if (f) {
        foundFeature = f;
        foundGroupKey = groupKey;
        break;
      }
    }
  }

  if (foundFeature) {
    console.log(`Found Mon Jong feature in group "${foundGroupKey}":`);
    console.log(JSON.stringify(foundFeature, null, 2));
  } else {
    console.log('Mon Jong feature not found directly via standard search.');
    // Let's do a substring search in raw text of objects
    for (const groupKey in json.data) {
      const group = json.data[groupKey];
      if (group.features) {
        group.features.forEach((feat, idx) => {
          if (JSON.stringify(feat).includes('501804')) {
            console.log(`Found via raw substring in group "${groupKey}", index ${idx}:`);
            console.log(JSON.stringify(feat, null, 2));
          }
        });
      }
    }
  }
}

main();
