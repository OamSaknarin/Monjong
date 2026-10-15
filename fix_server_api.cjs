const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf-8');

// Use replacement to add rain_24h to mappedData
content = content.replace(
/const lng = parseFloat\(d\.station\?\.tele_station_long\) \|\| 0;/g,
`const lng = parseFloat(d.station?.tele_station_long) || 0;
      const rain = parseFloat(d.rain_24h) || 0;
      const subdistrict = d.geocode?.tumbon_name?.th || '';
      const district = d.geocode?.amphoe_name?.th || '';
`
);

content = content.replace(
/lng: lng\n\s*\};\n\s*\}\);\n/g,
`lng: lng,
        rain24h: rain,
        subdistrict: subdistrict,
        district: district
      };
    });
`
);

fs.writeFileSync('api/index.ts', content, 'utf-8');
console.log("Added rain24h, subdistrict, and district to API response.");
