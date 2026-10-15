const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf-8');

const targetFunctionRegex = /app\.get\(\['\/api\/thaiwater-weather', '\/thaiwater-weather'\], async \(req, res\) => \{[\s\S]*?\n\}\);/m;

const newFunction = `app.get(['/api/thaiwater-weather', '/thaiwater-weather'], async (req, res) => {
  try {
    // 1. ดึงข้อมูลพิกัดจากต้นทางผังน้ำ (rain_24h)
    const targetUrl = \`https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h\`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0'
      },
      signal: controller.signal
    });
    clearTimeout(id);

    const json = await response.json();
    if (!json || json.result !== 'OK' || !json.data) {
      throw new Error('Invalid response from Thaiwater stations API');
    }

    // Filter for Chiang Mai
    const chiangMaiStations = json.data.filter((d: any) => 
      d.geocode?.province_code === '50' || 
      d.geocode?.province_name?.th === 'เชียงใหม่'
    );
    const validStations = chiangMaiStations.filter((st: any) => st.station?.tele_station_lat && st.station?.tele_station_long);

    // 2. ดึงข้อมูลอุณหภูมิและความชื้นสัมพัทธ์จาก กรมอุตุนิยมวิทยา (TMD) ของจริง
    let tmdData: any[] = [];
    try {
      const tmdUrl = 'https://data.tmd.go.th/api/WeatherToday/V2/?uid=api&ukey=api12345&format=json';
      const tmdRes = await fetch(tmdUrl);
      const tmdJson = await tmdRes.json();
      if (tmdJson?.Stations?.Station) {
        tmdData = tmdJson.Stations.Station;
      }
    } catch (tmdErr) {
      console.error('TMD API Error:', tmdErr);
    }

    // 3. ผสานข้อมูลอุณหภูมิและความชื้นเข้ากับรายชื่อสถานี (แมปข้อมูลที่ใกล้เคียงที่สุดจาก TMD)
    const mappedData = validStations.map((d: any, idx: number) => {
      const code = d.station?.tele_station_oldcode || d.station?.id?.toString() || '';
      const nameRaw = d.station?.tele_station_name?.th || '';
      const lat = parseFloat(d.station?.tele_station_lat) || 0;
      const lng = parseFloat(d.station?.tele_station_long) || 0;

      let temp = 0;
      let humidity = 0;

      // หาระยะทางพิกัดที่ใกล้เคียงที่สุดจาก TMD
      if (tmdData.length > 0) {
        let closestSt = null;
        let minDistance = 999999;
        
        for (const tmd of tmdData) {
          const tmdLat = parseFloat(tmd.Latitude);
          const tmdLng = parseFloat(tmd.Longitude);
          const dist = Math.sqrt(Math.pow(tmdLat - lat, 2) + Math.pow(tmdLng - lng, 2));
          if (dist < minDistance) {
            minDistance = dist;
            closestSt = tmd;
          }
        }

        // ถ้าระยะห่างไม่เกินประมาณ 20-30km (0.3 degrees) ถือว่าพอใช้อ้างอิงได้
        if (closestSt && minDistance < 0.3) {
           temp = parseFloat(closestSt.Observation?.Temperature) || 0;
           humidity = parseFloat(closestSt.Observation?.RelativeHumidity) || 0;
        }
      }

      return {
        id: code,
        stationName: nameRaw,
        temp: temp,
        humidity: humidity,
        pressure: 1013,
        lat: lat,
        lng: lng
      };
    });

    return res.json({
      success: true,
      data: mappedData
    });
  } catch (err: any) {
    console.error('Thaiwater Weather API error:', err);
    let errorMsg = err.message;
    if (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
      errorMsg = 'การเชื่อมต่อหมดเวลา (Timeout 8s)';
    }
    res.json({ success: false, error: 'ไม่สามารถติดต่อเซิร์ฟเวอร์คลังข้อมูลน้ำแห่งชาติได้: ' + errorMsg });
  }
});`;

content = content.replace(targetFunctionRegex, newFunction);

fs.writeFileSync('api/index.ts', content, 'utf-8');
console.log("Successfully replaced thaiwater-weather endpoint");
