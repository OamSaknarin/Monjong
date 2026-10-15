const fs = require('fs');
fetch('https://data.tmd.go.th/api/WeatherToday/V2/?uid=api&ukey=api12345&format=json')
  .then(res => res.json())
  .then(json => {
    const chiangmai = json.Stations.Station.filter(s => s.Province === "เชียงใหม่" || s.Province === "Chiang Mai");
    console.log(JSON.stringify(chiangmai, null, 2));
  });
