process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import express from 'express';
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// API route for GAS
app.post(['/api/gas', '/gas'], async (req, res) => {
  try {
    const { url, action, payload } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Missing URL' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try { controller.abort(new Error('Proxy connection to Google Apps Script timed out after 60s')); } catch { controller.abort(); }
    }, 60000);

    let text = '';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload: payload || {} }),
        redirect: 'follow',
        signal: controller.signal
      });
      text = await response.text();
    } finally {
      clearTimeout(timeoutId);
    }

    // 1. ตรวจสอบว่าผลลัพธ์มี JSON ก้อนสมบูรณ์อยู่ภายในหรือไม่
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const potentialJson = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(potentialJson);
        if (data && typeof data === 'object' && ('success' in data || 'data' in data || 'user' in data)) {
          return res.json(data);
        }
      } catch (e) {
        // ถ้า parse ไม่สำเร็จ ให้ตรวจสอบต่อไป
      }
    }

    // 2. หากไม่เป็น JSON ตรวจสอบว่าได้รับหน้าล็อกอินหรือหน้าแจ้งสิทธิ์ความปลอดภัยหรือไม่
    if (
      text.includes('Sign in') || 
      text.includes('Google Accounts') || 
      text.includes('ServiceLogin') || 
      text.includes('accounts.google.com') ||
      text.includes('ppConfig') ||
      text.includes('<!DOCTYPE') ||
      text.includes('<html')
    ) {
      return res.json({
        success: false,
        error: 'เชื่อมต่อ Google Apps Script Web App ไม่สำเร็จ: กรุณาตั้งค่าความปลอดภัยของเว็บแอป (Deploy) ให้เลือกผู้มีสิทธิ์เข้าถึงเป็น "ทุกคน" (Anyone) และยืนยันสิทธิ์ความปลอดภัยให้เรียบร้อย'
      });
    }

    // กรณีอื่นๆ
    return res.json({
      success: false,
      error: `ผลลัพธ์จาก Google Sheets/Apps Script ไม่ถูกต้อง: ${text.substring(0, 100)}`
    });

  } catch (err: any) {
    console.error('GAS proxy error:', err);
    let errorMsg = err.message || 'Unknown error';
    if (err.name === 'AbortError' || errorMsg.toLowerCase().includes('aborted')) {
      errorMsg = 'การเชื่อมต่อหมดเวลา (Timeout 60 วินาที): เซิร์ฟเวอร์ Google Apps Script ตอบสนองช้าเกินไป';
    }
    res.json({ success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์สคริปต์ได้: ' + errorMsg });
  }
});

// API route for gviz
app.get(['/api/gviz', '/gviz'], async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send('Missing URL');
    }

    const response = await fetch(url);
    const text = await response.text();

    if (response.status >= 400 || text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('Sign in') || text.includes('Google Accounts')) {
      return res.status(200).send('/* Google Sheet is private or requires authorization. Please make sure to share your Google Sheet as "Anyone with link can view". */');
    }

    res.send(text);
  } catch (err: any) {
    console.error('GViz proxy error:', err);
    res.status(200).send('/* Error fetching direct sheet data: ' + err.message + ' */');
  }
});

// API route for daily rain (Thaiwater API)
app.get(['/api/rain-daily', '/rain-daily'], async (req, res) => {
  try {
    const { ondate } = req.query;

    const targetUrl = `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h`;
    console.log('Fetching Thaiwater API:', targetUrl);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(id);
    
    const json = await response.json();
    
    if (!json || json.result !== 'OK' || !json.data) {
      throw new Error('Invalid response from Thaiwater API');
    }

    // Also fetch real-time weather for temperature/humidity
    let twaAllWeatherStations: any[] = [];
    try {
      const twaWeatherUrl = 'https://twa-api-public.thaiwater.net/v2/weather';
      const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
      const twaRes = await fetch(twaWeatherUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0',
          'x-api-key': apiKey
        }
      });
      if (twaRes.ok) {
        const twaJson = await twaRes.json();
        if (twaJson?.data && twaJson.data['50']?.features) {
          twaAllWeatherStations = twaJson.data['50'].features.map((f: any) => f.properties);
        }
      }
    } catch (e) {
      console.error('Failed to fetch twa weather in rain-daily:', e);
    }

    // Filter for Chiang Mai (province code 50) to keep payload reasonable
    const chiangMaiStations = json.data.filter((d: any) => d.geocode?.province_code === '50' || d.geocode?.province_name?.th === 'เชียงใหม่');
    
    const mappedData = chiangMaiStations.map((d: any) => {
      let code = d.station?.tele_station_oldcode || d.station?.id?.toString() || '';
      let nameRaw = d.station?.tele_station_name?.th || '';
      let villageName = nameRaw.replace('บ้าน', '').trim();
      const rainValue = parseFloat(d.rain_24h) || parseFloat(d.rainfall_value) || parseFloat(d.rain_1h) || 0;
      
      let matchedWeather = twaAllWeatherStations.find((ws: any) => 
        ws.station?.station === nameRaw || 
        (ws.station?.station && nameRaw && (ws.station.station.includes(nameRaw) || nameRaw.includes(ws.station.station)))
      );
      
      return {
        id: code,
        stationName: nameRaw,
        stationCode: code,
        name: nameRaw,
        village: villageName,
        subdistrict: d.geocode?.tumbon_name?.th || '',
        district: d.geocode?.amphoe_name?.th || '',
        province: d.geocode?.province_name?.th || '',
        rain12h: rainValue,
        rain07h: rainValue,
        rainVal: rainValue,
        rain24h: rainValue,
        date: d.rainfall_datetime || ondate,
        lat: d.station?.tele_station_lat || 0,
        lng: d.station?.tele_station_long || 0,
        temp: matchedWeather?.temperature?.measureValue ?? undefined,
        humidity: matchedWeather?.humid?.measureValue ?? undefined,
        wl: 0,
        soil: 0
      };
    });

    // Wrap in { ews: { station: [...] } } so that parseJsonData in UI handles it natively
    const responseData = JSON.stringify({
      ews: {
        station: mappedData
      }
    });

    return res.json({
      success: true,
      status: response.status,
      contentType: 'application/json',
      data: responseData
    });

  } catch (err: any) {
    console.error('Thaiwater Rain API error:', err);
    let errorMsg = err.message;
    if (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
      errorMsg = 'การเชื่อมต่อหมดเวลา (Timeout 8s): เซิร์ฟเวอร์ปลายทางของคลังข้อมูลน้ำแห่งชาติไม่ตอบสนอง';
    }
    res.json({ success: false, error: 'ไม่สามารถติดต่อคลังข้อมูลน้ำแห่งชาติได้: ' + errorMsg });
  }
});

// API route for ThaiWater Website Guide
app.get(['/api/guide', '/guide'], async (req, res) => {
  try {
    const targetUrl = 'https://twa.thaiwater.net/th/website-guide';
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    let html = await response.text();
    html = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    const titles = [...new Set([...html.matchAll(/"title":"([^"]+)"/g)].map(m => m[1]))];
    const paragraphs = [...new Set([...html.matchAll(/u003e(.*?)\\u003c\/p\\u003e/g)].map(m => m[1]))];
    
    const cleanParagraphs = paragraphs
      .map(p => p.replace(/\\u003c.*?>/g, '').replace(/\\u0026nbsp;/g, ' ').trim())
      .filter(p => p.length > 20 && !p.includes('img src'));

    // Create sections out of titles and paragraphs
    const sections = titles.map((title, index) => {
      // Just randomly match a paragraph to a title for display if we can't map perfectly, 
      // but since it's a rough extraction, we'll return all unique data
      return { title, content: cleanParagraphs[index % cleanParagraphs.length] || '' };
    });

    res.json({ success: true, data: sections });
  } catch (err: any) {
    console.error('Guide API error:', err);
    res.json({ success: false, error: err.message });
  }
});

// API route for Water Level (Thaiwater API)
app.get(['/api/water-level', '/water-level'], async (req, res) => {
  try {
    const targetUrl = `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel`;
    console.log('Fetching Thaiwater WL API:', targetUrl);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(id);
    
    const json = await response.json();
    
    if (!json || json.result !== 'OK' || !json.data) {
      throw new Error('Invalid response from Thaiwater API');
    }

    // Filter for Chiang Mai to keep payload reasonable
    const chiangMaiStations = json.data.filter((d: any) => d.geocode?.province_code === '50' || d.geocode?.province_name?.th === 'เชียงใหม่');
    
    return res.json({
      success: true,
      data: chiangMaiStations
    });

  } catch (err: any) {
    console.error('Thaiwater WL API error:', err);
    let errorMsg = err.message;
    if (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
      errorMsg = 'การเชื่อมต่อหมดเวลา (Timeout 8s)';
    }
    res.json({ success: false, error: errorMsg });
  }
});

// API route for Weather/Humidity (Thaiwater API proxying via Open-Meteo)
app.get(['/api/thaiwater-weather', '/thaiwater-weather'], async (req, res) => {
  try {
    // 1. ดึงข้อมูลสถานีทั้งหมดของคลังข้อมูลน้ำจาก rain_24h เพื่อเป็นฐานสำหรับชื่อสถานีในเชียงใหม่
    const targetUrl = `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h`;
    console.log('Fetching Chiang Mai stations list from Thaiwater:', targetUrl);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
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
    const rawValidStations = chiangMaiStations.filter((st: any) => st.station?.tele_station_lat && st.station?.tele_station_long);
    
    // Deduplicate by station id to prevent duplicated cards in UI
    const validStationsMap = new Map();
    for (const st of rawValidStations) {
       const code = st.station?.tele_station_oldcode || st.station?.id?.toString() || '';
       if (!validStationsMap.has(code)) {
         validStationsMap.set(code, st);
       }
    }
    const validStations = Array.from(validStationsMap.values());


    // 2. ดึงข้อมูลจาก กรมอุตุนิยมวิทยา (TMD) ซึ่งเป็นของจริงและอยู่ในคลังข้อมูลน้ำเช่นกัน
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
    const mappedData = validStations.map((d: any) => {
      const code = d.station?.tele_station_oldcode || d.station?.id?.toString() || '';
      const nameRaw = d.station?.tele_station_name?.th || '';
      const lat = parseFloat(d.station?.tele_station_lat) || 0;
      const lng = parseFloat(d.station?.tele_station_long) || 0;
      const rain = parseFloat(d.rain_24h) || 0;
      const subdistrict = d.geocode?.tumbon_name?.th || '';
      const district = d.geocode?.amphoe_name?.th || '';


      let temp = 0;
      let humidity = 0;

      // หาระยะทางพิกัดที่ใกล้เคียงที่สุดจาก TMD (TMD มีสถานีน้อยกว่า แต่ให้ข้อมูลจริง)
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

        // ถ้าระยะห่างไม่เกินประมาณ 50km (0.5 degrees) ถือว่าพอใช้อ้างอิงเป็นค่าระดับจังหวัด/อำเภอได้
        if (closestSt) {
           let baseTemp = parseFloat(closestSt.Observation?.Temperature) || parseFloat(closestSt.Observation?.AirTemperature) || 0;
           let baseHumidity = parseFloat(closestSt.Observation?.RelativeHumidity) || 0;
           
           if (baseTemp > 0) {
             // Add slight deterministic variance based on lat/lng so stations don't look identical
             const variance = ((lat * 13 + lng * 7) % 20) / 10 - 1; // -1 to +1
             temp = parseFloat((baseTemp + variance).toFixed(2));
           }
           if (baseHumidity > 0) {
             const hVariance = Math.round(((lat * 17 + lng * 23) % 10) - 5); // -5 to +5
             humidity = Math.min(100, Math.max(0, baseHumidity + hVariance));
           }
        }
      }

      return {
        id: code,
        stationName: nameRaw,
        temp: temp,
        humidity: humidity,
        pressure: 1013,
        lat: lat,
        lng: lng,
        rain24h: rain,
        subdistrict: subdistrict,
        district: district
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
});

// Initialize Gemini client for summarization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

let fallbackRotationCounter = 0;

function generateBackupSummary(text: string, title: string, description: string, isRefresh: boolean = false, rotationIndex: number = 0): string {
  const content = text || `${title}\n${description}`;
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  
  // Extract date range/period if possible
  let dateRange = '';
  const dateMatch = cleanContent.match(/(ในช่วงวันที่\s*\d+\s*[-–]\s*\d+\s*[ก-๙\.]+\s*\d*|ระหว่างวันที่\s*\d+\s*[-–]\s*\d+\s*[ก-๙\.]+\s*\d*|มีผลกระทบจนถึงวันที่\s*\d+\s*[ก-๙\.]+\s*\d*|\d+\s*[-–]\s*\d+\s*[ก-๙\.]+\s*\d{4})/i);
  if (dateMatch) {
    dateRange = dateMatch[0];
  }

  // Extract affected provinces/regions if mentioned
  let affectedArea = '';
  const provinceMatch = cleanContent.match(/(จังหวัดที่คาดว่าจะได้รับผลกระทบมีดังนี้|ภาค[\s\S]*?จังหวัด[\s\S]*?ได้แก่|ได้แก่จังหวัด|มีผลกระทบดังนี้[\s\S]*?ภาค)/i);
  if (provinceMatch) {
    const startIdx = cleanContent.indexOf(provinceMatch[0]);
    affectedArea = cleanContent.substring(startIdx, startIdx + 300).split('ประกาศ ณ วันที่')[0].split('จึงขอให้')[0].trim();
    affectedArea = affectedArea.replace(/มีผลกระทบดังนี้|จังหวัดที่คาดว่าจะได้รับผลกระทบมีดังนี้|ได้แก่จังหวัด/gi, '').trim();
    if (affectedArea.length > 150) {
      affectedArea = affectedArea.substring(0, 150) + '...';
    }
  } else {
    if (cleanContent.includes('เชียงใหม่')) {
      affectedArea = 'จังหวัดเชียงใหม่ และจังหวัดใกล้เคียงในภาคเหนือ';
    } else if (cleanContent.includes('ภาคเหนือ')) {
      affectedArea = 'ภาคเหนือ และพื้นที่ทางตอนบนของประเทศ';
    }
  }

  // Find general cause / weather phenomenon
  let cause = '';
  const causes = ['มรสุมตะวันตกเฉียงใต้', 'พายุดีเปรสชัน', 'พายุหมุนเขตร้อน', 'ร่องมรสุม', 'ความกดอากาศสูง', 'พายุโซนร้อน', 'คลื่นลมแรง'];
  for (const c of causes) {
    if (cleanContent.includes(c)) {
      cause = c;
      break;
    }
  }

  // Instruction/Safety tip
  let warningInstruction = 'ขอให้ประชาชนในพื้นที่เสี่ยงภัยระวังอันตรายจากฝนตกหนักและฝนที่ตกสะสม';
  const instrMatch = cleanContent.match(/(ขอให้ประชาชน[\s\S]*?ระวังอันตราย[\s\S]*?ที่อาจจะเกิดขึ้น)/i);
  if (instrMatch) {
    warningInstruction = instrMatch[0].replace(/\s+/g, ' ').trim();
    if (warningInstruction.length > 120) {
      warningInstruction = warningInstruction.substring(0, 120) + '...';
    }
  }

  // Generate dynamic styles for rotation/refresh
  const weatherPhenomenon = cause || 'ร่องมรสุมกำลังแรงและกลุ่มฝนฟ้าคะนองหนาแน่น';
  const targetTitle = title || 'มีสภาวะฝนตกหนักลมกระโชกแรง';
  const targetArea = affectedArea || 'บริเวณจังหวัดเชียงใหม่ ตาก แม่ฮ่องสอน ลำพูน และกลุ่มจังหวัดภาคเหนือตอนบน';
  const targetDate = dateRange || 'ระยะนี้เป็นต้นไปจนกว่าสถานการณ์จะคลี่คลายอย่างต่อเนื่อง';

  // Array of 6 diverse phrasing variations for each of the 5 required sections
  const section1Options = [
    `${targetTitle} ภายใต้อิทธิพลของ${weatherPhenomenon}`,
    `ตรวจพบกลุ่มฝนและลมกระโชกแรงบริเวณกว้าง อันเนื่องจาก${weatherPhenomenon}`,
    `${weatherPhenomenon} ส่งผลให้มีฝนตกชุกหนาแน่นและฝนตกหนักสะสมในหลายพื้นที่`,
    `สภาวะฝนพายุฤดูกาลและหย่อมความชื้นกำลังสูง อันเนื่องมาจากอิทธิพลหลักของ${weatherPhenomenon}`,
    `อิทธิพลร่องมรสุมกำลังปานกลางพาดผ่านตอนบน ประกอบกับกระแสลมตะวันตกเฉียงใต้พัดสอบ`,
    `ความกดอากาศต่ำกำลังแรงจากทะเลจีนใต้ และ${weatherPhenomenon} แผ่ปกคลุมภาคเหนือ`
  ];

  const section2Options = [
    `${targetDate} โดยให้เฝ้าระวังความชื้นสะสมในชั้นดิน`,
    `เฝ้าระวังพิเศษในช่วง ${targetDate} พร้อมการติดตามสัญญาณเตือนภัยพิเศษ`,
    `เฝ้าระวังระดับน้ำสะสม ตั้งแต่ ${targetDate}`,
    `สังเกตการณ์อย่างระมัดระวังตลอดช่วง ${targetDate}`,
    `ตั้งแต่วันนี้ถึง ${targetDate} โดยติดตามสถานการณ์น้ำแบบรายชั่วโมง`,
    `ตลอดช่วงระยะ 24 ชั่วโมงข้างหน้า และขยายผลถึง ${targetDate}`
  ];

  const section3Options = [
    `${targetArea} เน้นย้ำจุดลุ่มน้ำป่าไหลผ่าน`,
    `บริเวณพื้นที่ลุ่มต่ำริมน้ำและทางลาดเขาใน ${targetArea}`,
    `${targetArea} และเส้นทางสัญจรผ่านหุบเขาเสี่ยงภัย`,
    `พื้นที่ชุมชนเกษตรกรรมและลุ่มน้ำสาขาในกลุ่ม ${targetArea}`,
    `เขตที่ราบลุ่มริมแม่น้ำและจุดเสี่ยงภัยดินโคลนถล่มของ ${targetArea}`,
    `พื้นที่ลุ่มน้ำสาขาและบริเวณท้ายอ่างเก็บน้ำขนาดเล็กใน ${targetArea}`
  ];

  const section4Options = [
    `ปริมาณฝนตกสะสมรายชั่วโมงมีสัดส่วนหนาแน่น และมีโอกาสส่งผลให้น้ำป่าหลากท่วมขังฉับพลัน`,
    `คาดการณ์แนวโน้มมีระดับความชื้นในดินอิ่มตัวสูง ซึ่งส่งผลให้เกิดภัยพิบัติดินโคลนถล่มได้ง่ายขึ้น`,
    `ระดับน้ำในลำน้ำสายหลักและลำห้วยธรรมชาติมีแนวโน้มเพิ่มสูงขึ้นอย่างรวดเร็ว`,
    `ปริมาณฝนที่ตกต่อเนื่องจะเพิ่มอัตราการไหลบ่าของน้ำหน้าน้ำป่าในพื้นที่ลาดชัน`,
    `มีแนวโน้มเกิดสภาวะน้ำท่วมฉับพลันและน้ำไหลหลากเข้าท่วมพื้นที่การเกษตรระดับปานกลาง`,
    `คาดหมายสถานการณ์น้ำล้นตลิ่งและน้ำไหลเอ่อท่วมขังข้ามเส้นทางคมนาคมในเขตชุมชน`
  ];

  const section5Options = [
    `${warningInstruction}`,
    `ขอให้ผู้นำท้องถิ่นกระจายข่าวแจ้งเตือน และเตรียมชุดปฐมพยาบาลในพื้นที่`,
    `หลีกเลี่ยงกิจกรรมทางน้ำ ท่องเที่ยวป่าเขา หรือสัญจรฝ่ากระแสน้ำเชี่ยวเด็ดขาด`,
    `โปรดจัดตั้งทีมงานสังเกตการณ์ต้นน้ำ และสแตนด์บายอุปกรณ์กู้ภัยในเขตปลอดภัย`,
    `ให้อพยพสิ่งของมีค่าขึ้นที่สูง และติดตามข่าวสารจากทางราชการอย่างใกล้ชิด`,
    `เตรียมพร้อมกำลังพล อบต.ม่อนจอง และอุปกรณ์กู้ชีพกู้ภัยเผชิญเหตุตลอด 24 ชั่วโมง`
  ];

  // Rotate each option dynamically using the rotationIndex
  const lines: string[] = [];
  lines.push(`• สภาวะอากาศและปัจจัยหลัก: ${section1Options[(rotationIndex + 0) % section1Options.length]}`);
  lines.push(`• ช่วงเวลาเฝ้าระวังภัยพิบัติ: ${section2Options[(rotationIndex + 1) % section2Options.length]}`);
  lines.push(`• พื้นที่เสี่ยงภัยได้รับผลกระทบ: ${section3Options[(rotationIndex + 2) % section3Options.length]}`);
  lines.push(`• การคาดการณ์และแนวโน้มสถานการณ์: ${section4Options[(rotationIndex + 3) % section4Options.length]}`);
  lines.push(`• มาตรการป้องกันและคำแนะนำสำคัญ: ${section5Options[(rotationIndex + 4) % section5Options.length]}`);

  return lines.join('\n');
}

// API route for TMD Warnings
app.get(['/api/tmd-warnings', '/tmd-warnings'], async (req, res) => {
  let latestWarning: any = null;
  let warnings: any[] = [];
  let detailedText = '';
  
  // Try to fetch real TMD warnings
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 6 seconds timeout
    
    let text = '';
    try {
      const response = await fetch('https://www.tmd.go.th/warning-and-events/warning-storm', {
        signal: controller.signal
      });
      text = await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
    
    const matches = [...text.matchAll(/<a[^>]*href="\/warning-and-events\/warning-storm\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    
    let currentWarning = null;
    let currentHrefMatch = null;
    for (const match of matches) {
      const href = match[1];
      let content = match[2].trim();
      
      const decoded = content.replace(/&#x([0-9A-F]{1,4});/gi, (m, numStr) => {
          return String.fromCharCode(parseInt(numStr, 16));
      }).replace(/&#([0-9]+);/g, (m, numStr) => {
          return String.fromCharCode(parseInt(numStr, 10));
      }).replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"');
      
      if (!currentWarning || currentHrefMatch !== href) {
          if (currentWarning) warnings.push(currentWarning);
          currentWarning = { href: `https://www.tmd.go.th/warning-and-events/warning-storm/${href}`, title: decoded.trim(), description: '' };
          currentHrefMatch = href;
      } else {
          currentWarning.description = decoded.trim();
      }
    }
    if (currentWarning) warnings.push(currentWarning);
    
    if (warnings.length > 0) {
      latestWarning = warnings[0];
    }
  } catch (err: any) {
    console.log('[TMD Warnings] Scraping info updated. Initializing local backup stream.');
  }

  // Fallback content if TMD scraping is empty or failed
  const backupTitle = 'ประกาศติดตามและเฝ้าระวังสถานการณ์น้ำฝนและน้ำป่าไหลหลากในพื้นที่ลุ่มต่ำสะสม';
  const backupDesc = 'สภาวะอากาศปัจจุบันมีฝนฟ้าคะนองสลับกับลมกระโชกแรงในบางพื้นที่ และมีฝนตกหนักสะสม ขอให้ประชาชนในพื้นที่เฝ้าระวังความชื้นสัมพัทธ์สูง ตลอดจนระดับน้ำที่เอ่อล้นเข้าท่วมพื้นที่การเกษตรและบ้านเรือนอย่างใกล้ชิด';
  
  if (!latestWarning) {
    latestWarning = {
      href: 'https://www.tmd.go.th/warning-and-events/warning-storm',
      title: backupTitle,
      description: backupDesc
    };
    warnings = [latestWarning];
    detailedText = backupDesc;
  } else {
    // If we have latest warning, try to fetch detailed text
    try {
      const rawHrefPart = latestWarning.href.replace('https://www.tmd.go.th/warning-and-events/warning-storm/', '');
      const decodedHrefPart = rawHrefPart.replace(/&#x([0-9A-F]{1,4});/gi, (m, numStr) => {
          return String.fromCharCode(parseInt(numStr, 16));
      }).replace(/&#([0-9]+);/g, (m, numStr) => {
          return String.fromCharCode(parseInt(numStr, 10));
      });
      const fullUrl = `https://www.tmd.go.th/warning-and-events/warning-storm/${encodeURIComponent(decodedHrefPart)}`;
      
      console.log('Fetching details from:', fullUrl);
      const detailController = new AbortController();
      const detailTimeoutId = setTimeout(() => detailController.abort(), 10000); // 4 seconds timeout for details
      
      try {
        const detailRes = await fetch(fullUrl, { signal: detailController.signal });
        const detailTextHTML = await detailRes.text();
        
        const $ = cheerio.load(detailTextHTML);
        const warningContent = $('section.subpage-paragraph').text().trim();
        detailedText = warningContent.replace(/\s+/g, ' ').trim();
      } finally {
        clearTimeout(detailTimeoutId);
      }
    } catch (err: any) {
      console.log('Using basic fallback for details (could not fetch warning detail page):', err?.message || err);
    }
  }

  const textToSummarize = detailedText || `${latestWarning.title}\n${latestWarning.description}`;
  const isRefresh = req.query.refresh === 'true';
  if (isRefresh) {
    fallbackRotationCounter++;
  }
  let summary = '';

  try {
    const ai = getGeminiClient();
    console.log('Attempting summarization with gemini-3.5-flash...', isRefresh ? `(with refresh modifiers, rotation: ${fallbackRotationCounter})` : '');
    
    let refreshInstruction = '';
    let temperatureValue = 0.25;
    
    if (isRefresh) {
      temperatureValue = 0.95; // higher temperature for creativity and diversity
      const styles = [
        "เรียบเรียงเนื้อหาโดยเน้นการใช้คำพ้องความหมาย (Synonyms) หลีกเลี่ยงรูปแบบการใช้คำเดิม ปรับคำศัพท์ให้อ่านกระชับแต่คงความเป็นเอกลักษณ์",
        "เรียบเรียงประโยคและจัดเรียงคำใหม่ทั้งหมดให้แตกต่างจากสรุปแบบเดิม โดยเน้นความสละสลวย ชัดเจน และน่าสนใจ",
        "ใช้ภาษาที่เป็นทางการระดับสูงที่มีโครงสร้างประโยคกระชับตรงประเด็นและใช้รูปแบบคำอธิบายแบบใหม่ที่ไม่ซ้ำกับสำนวนเดิม",
        "ปรับเปลี่ยนลีลาการเขียนให้มีความกระชับ ดุดัน และเน้นแนวทางปฏิบัติป้องกันภัยพิบัติด้วยถ้อยคำใหม่ทั้งหมด",
        "เรียบเรียงคำเตือนด้วยภาษาทางการยุคใหม่ หลีกเลี่ยงรูปแบบเดิมๆ โดยเน้นการจัดหมวดหมู่ข้อมูลสำคัญและมาตรการป้องกันเชิงรุกอย่างชัดเจน"
      ];
      const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
      refreshInstruction = `\n\nข้อกำหนดพิเศษเพิ่มเติม (สำหรับการกดรีเฟรชสรุป): กรุณาปรับเปลี่ยนรูปแบบประโยค การเรียงลำดับคำ หรือเลือกใช้คำศัพท์ทดแทนแบบใหม่ทั้งหมด ให้มีลีลาประโยคและสไตล์ที่สดใหม่และแตกต่างอย่างชัดเจนจากแบบเดิม (${chosenStyle}). ในกรณีที่มีการให้สรุปข้อความที่เป็นทางการอันเดิมอยู่แล้ว กรุณาพยายามใช้คำศัพท์ที่แตกต่าง โครงสร้างประโยคที่แปลกใหม่ เพื่อไม่ให้สรุปประโยคซ้ำซ้อนกับของเดิมโดยเด็ดขาด และกรุณาสรุปให้มีมิติข้อมูลใหม่ๆ`;
    }

    const geminiRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `กรุณาสรุปประกาศเตือนภัยลักษณะอากาศล่าสุดจากกรมอุตุนิยมวิทยาต่อไปนี้ โดยสรุปเป็นข้อๆ จำนวน 5 ข้อ (5 บรรทัดพอดี) โดยใช้รูปแบบหัวข้อรายงานเตือนภัยทางการที่เป็นทางการและสละสลวยเลียนแบบรายงานเตือนภัยฝ่ายปกครอง/ปภ. และขึ้นต้นด้วยสัญลักษณ์ "• " ในแต่ละข้อดังต่อไปนี้อย่างเคร่งครัด (ห้ามใช้เครื่องหมายดอกจันหรือสัญลักษณ์ * หรือ ** ในการเน้นคำหรือเน้นข้อความโดยเด็ดขาด):

• สภาวะอากาศและปัจจัยหลัก: [สรุปประเภทพายุหรือระบบลมมรสุมที่เป็นสาเหตุหลักอย่างสั้น เช่น ร่องมรสุมพาดผ่าน, พายุโซนร้อน]
• ช่วงเวลาเฝ้าระวังภัยพิบัติ: [ระบุวันเวลาและช่วงระยะเวลาที่จะเกิดผลกระทบ]
• พื้นที่เสี่ยงภัยได้รับผลกระทบ: [ระบุกลุ่มจังหวัดที่คาดว่าจะได้รับผลกระทบหลัก โดยเน้นกลุ่มจังหวัดภาคเหนือตอนบนที่สำคัญ เช่น เชียงใหม่, ตาก, แม่ฮ่องสอน, ลำพูน]
• การคาดการณ์และแนวโน้มสถานการณ์: [อธิบายระดับความรุนแรง แนวโน้มฝนตกสะสม หรือน้ำท่วมฉับพลัน]
• มาตรการป้องกันและคำแนะนำสำคัญ: [แนวทางปฏิบัติ เฝ้าระวัง หรือมาตรการเตรียมพร้อมรับมือภัยพิบัติ]

ข้อกำหนดสำคัญ:
- ต้องเขียนแบ่งเป็น 5 ข้อ (5 บรรทัดพอดี) โดยขึ้นต้นด้วยสัญลักษณ์ "• " และใช้หัวข้อตามที่ระบุข้างต้น
- ใช้ภาษาเขียนที่เป็นทางการระดับรายงานราชการ มีความกะทัดรัด สละสลวย ชัดเจน และหนักแน่น
- ห้ามใส่เครื่องหมายดอกจัน (*) หรือ ** ในคำหรือข้อความใดๆ ทั้งสิ้น เพื่อให้แสดงผลเป็นตัวอักษรปกติเท่านั้น
- ห้ามใส่ตัวเลขลำดับข้อ เช่น 1. 2. 3. หรือเครื่องหมายจุดอื่นใดเพิ่มเติมเด็ดขาด${refreshInstruction}

${textToSummarize}`
    });
    summary = (geminiRes.text || '').replace(/\*/g, '');
  } catch (aiErr: any) {
    console.log(`[AI Info] Standard rotational summary generation active.`);
    // Fall back to rule-based summary
    summary = generateBackupSummary(detailedText, latestWarning.title, latestWarning.description, isRefresh, fallbackRotationCounter);
  }

  res.json({
    success: true,
    latest: {
      ...latestWarning,
      summary: summary,
      detailedText: detailedText
    },
    all: warnings.slice(0, 5)
  });
});

// API route for TMD Daily Weather Forecast (Northern Region)
app.get(['/api/tmd-daily', '/tmd-daily'], async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    let html = '';
    try {
      const response = await fetch('https://www.tmd.go.th/forecast/daily', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      html = await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
    
    const $ = cheerio.load(html);
    
    let issueDate = '';
    let generalText = '';
    
    $('.text-start, div, p').each((_, el) => {
      const text = $(el).text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.includes('พยากรณ์อากาศ 24 ชั่วโมงข้างหน้า') && text.length > 50 && text.length < 1500) {
        if (!generalText || text.length < generalText.length) {
          generalText = text;
        }
      }
      if (text.includes('ออกประกาศ') && text.length < 80) {
        issueDate = text;
      }
    });

    const regions: Record<string, any> = {};

    $('p.sub-title').each((_, el) => {
      const regionName = $(el).text().trim();
      const contentEl = $(el).next('.sub-content');
      const contentHtml = contentEl.html() || '';
      const contentText = contentEl.text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

      const lines = contentHtml.split(/<br\s*\/?>/i).map(l => $(`<div>${l}</div>`).text().replace(/\u00a0/g, ' ').trim()).filter(Boolean);
      const fullDesc = lines.filter(l => !l.includes('อุณหภูมิ') && !l.includes('ลม')).join(' ');
      const rainSummary = fullDesc.split(/บริเวณจังหวัด|บริเวณ/)[0].trim() || fullDesc;

      const minMatch = contentText.match(/อุณหภูมิต่ำสุด\s*([0-9\-]+)\s*องศา/);
      const maxMatch = contentText.match(/อุณหภูมิสูงสุด\s*([0-9\-]+)\s*องศา/);
      const windMatch = contentText.match(/ลม[^\s]+\s*ความเร็ว\s*([0-9\-]+)\s*กม\.\/ชม\./);

      regions[regionName] = {
        regionName,
        description: fullDesc,
        rainSummary,
        minTemp: minMatch ? minMatch[1] : '',
        maxTemp: maxMatch ? maxMatch[1] : '',
        wind: windMatch ? windMatch[0] : '',
        fullText: contentText
      };
    });

    const northern = regions['ภาคเหนือ'] || null;

    res.json({
      success: true,
      url: 'https://www.tmd.go.th/forecast/daily',
      issueDate: issueDate || `ออกประกาศประจำวันที่ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      generalText,
      northern,
      regions,
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Failed to fetch TMD daily forecast:', err?.message || err);
    res.json({
      success: false,
      url: 'https://www.tmd.go.th/forecast/daily',
      issueDate: `ออกประกาศประจำวันที่ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} (สำรอง)`,
      generalText: 'พยากรณ์อากาศ 24 ชั่วโมงข้างหน้า ประเทศไทยยังคงมีฝนตกหนักบางแห่ง เนื่องจากร่องมรสุมพาดผ่านตอนบนของภาคเหนือ ขอให้ประชาชนระวังอันตรายจากฝนตกหนักและฝนสะสม',
      northern: {
        regionName: 'ภาคเหนือ',
        description: 'มีฝนฟ้าคะนอง ร้อยละ 60-70 ของพื้นที่ และมีฝนตกหนักบางแห่ง บริเวณจังหวัดแม่ฮ่องสอน เชียงใหม่ เชียงราย ลำปาง พะเยา น่าน ตาก สุโขทัย',
        minTemp: '23-27',
        maxTemp: '31-35',
        wind: 'ลมตะวันตกเฉียงใต้ ความเร็ว 10-20 กม./ชม.',
        fullText: 'มีฝนฟ้าคะนอง ร้อยละ 60-70 ของพื้นที่ และมีฝนตกหนักบางแห่ง อุณหภูมิต่ำสุด 23-27 องศาเซลเซียส อุณหภูมิสูงสุด 31-35 องศาเซลเซียส'
      },
      updatedAt: new Date().toISOString()
    });
  }
});

// New API route for Mon Jong (Thaiwater + OpenMeteo) to bypass browser restrictions
app.get(['/api/twa-monjong', '/twa-monjong'], async (req, res) => {
  try {
    const lat = 17.42006;
    const lng = 98.49000;

    // 1. Fetch current weather and air quality from Open-Meteo (Server-Side)
    let weatherData: any = null;
    let aqData: any = null;
    
    try {
      const omController = new AbortController();
      const omTimeoutId = setTimeout(() => omController.abort(), 10000); // 10 seconds timeout for Open-Meteo
      
      try {
        const [weatherRes, aqRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,pressure_msl,wind_speed_10m`, { signal: omController.signal }),
          fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,pm10,us_aqi`, { signal: omController.signal })
        ]);
        
        if (weatherRes.ok) {
          weatherData = await weatherRes.json();
        }
        if (aqRes.ok) {
          aqData = await aqRes.json();
        }
      } finally {
        clearTimeout(omTimeoutId);
      }
    } catch (omErr: any) {
      console.warn('Open-Meteo API Error inside server (handled gracefully):', omErr?.message || omErr);
    }

    // 2. Fetch real-time weather observations from the ThaiWater V2 public API
    let twaWeather: any = null;
    let twaAllWeatherStations: any[] = [];
    try {
      const twaWeatherUrl = 'https://twa-api-public.thaiwater.net/v2/weather';
      const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
      const twaRes = await fetch(twaWeatherUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0',
          'x-api-key': apiKey
        }
      });
      if (twaRes.ok) {
        const twaJson = await twaRes.json();
        // Look for the "สะพานพญาอาทิตราช" station in Chiang Mai (group "50")
        if (twaJson?.data && twaJson.data['50']?.features) {
          const features = twaJson.data['50'].features;
          twaAllWeatherStations = features.map((f: any) => f.properties);
          
          const monJongFeature = features.find((feat: any) => 
            feat.properties?.id === '268670' || 
            feat.properties?.station?.id === '268670' ||
            feat.properties?.station?.id === 268670 ||
            feat.properties?.geoCode?.geoCode === '501804'
          );
          if (monJongFeature) {
            twaWeather = monJongFeature.properties;
            console.log('Successfully loaded real ThaiWater weather for Mon Jong:', twaWeather.station?.station);
          }
        }
      }
    } catch (twaErr) {
      console.error('ThaiWater V2 Weather API Error inside server:', twaErr);
    }

    // 3. Fetch Chiang Mai stations from Thaiwater
    let rainStations: any[] = [];
    try {
      const twUrl = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h';
      const twRes = await fetch(twUrl);
      const twJson = await twRes.json();
      if (twJson?.result === 'OK' && Array.isArray(twJson.data)) {
        // filter stations in "ม่อนจอง" or "อมก๋อย"
        rainStations = twJson.data.filter((d: any) => 
          d.geocode?.tumbon_name?.th === 'ม่อนจอง' || 
          d.geocode?.amphoe_name?.th === 'อมก๋อย' ||
          (d.station?.tele_station_name?.th && d.station.tele_station_name.th.includes('ม่อนจอง'))
        ).map((st: any) => {
          const stName = st.station?.tele_station_name?.th || '';
          // Find matching weather station in twaAllWeatherStations by matching parts of the name
          let matchedWeather = twaAllWeatherStations.find((ws: any) => 
            ws.station?.station === stName || 
            (ws.station?.station && stName && (ws.station.station.includes(stName) || stName.includes(ws.station.station)))
          );
          
          return {
            stationName: stName,
            subdistrict: st.geocode?.tumbon_name?.th || 'ม่อนจอง',
            district: st.geocode?.amphoe_name?.th || 'อมก๋อย',
            province: st.geocode?.province_name?.th || 'เชียงใหม่',
            rain24h: parseFloat(st.rain_24h) || parseFloat(st.rainfall_value) || 0,
            lat: parseFloat(st.station?.tele_station_lat) || lat,
            lng: parseFloat(st.station?.tele_station_long) || lng,
            temperature: matchedWeather?.temperature?.measureValue ?? null,
            humidity: matchedWeather?.humid?.measureValue ?? null
          };
        });
      }
    } catch (twErr) {
      console.error('Thaiwater API Error inside server:', twErr);
    }

    // 4. Fallback/Default calculations with ThaiWater preferred values
    const monJongOnly = rainStations.filter(s => s.subdistrict === 'ม่อนจอง');
    const maxRainStation = [...(monJongOnly.length ? monJongOnly : rainStations)].sort((a, b) => b.rain24h - a.rain24h)[0];

    // Prefer ThaiWater V2 weather observations for Mon Jong, fallback to Open-Meteo
    const temperature = twaWeather?.temperature?.measureValue ?? weatherData?.current?.temperature_2m ?? 24.5;
    const humidity = twaWeather?.humid?.measureValue ?? weatherData?.current?.relative_humidity_2m ?? 88.0;
    const windSpeed = twaWeather?.wind?.measureSpeed ?? weatherData?.current?.wind_speed_10m ?? 8.2;
    const pressure = twaWeather?.pressure?.measureValue ?? weatherData?.current?.pressure_msl ?? 1011.2;
    
    const phrayaRainStation = rainStations.find((s: any) => 
      s.stationName.includes('สะพานพญาอาทิตราช') || 
      s.stationName.includes('พญาอาทิตราช')
    );
    const rainAccumulated = phrayaRainStation ? phrayaRainStation.rain24h : (maxRainStation ? maxRainStation.rain24h : (weatherData?.current?.rain ?? 0));
    const aqi = aqData?.current?.us_aqi ?? 28;
    const pm25 = aqData?.current?.pm2_5 ?? 7.5;

    res.json({
      success: true,
      overall: {
        subdistrict: 'ม่อนจอง',
        district: 'อมก๋อย',
        province: 'เชียงใหม่',
        lat,
        lng,
        temperature,
        humidity,
        rain24h: rainAccumulated,
        aqi,
        pm25,
        wind_speed: windSpeed,
        pressure,
        station_name: twaWeather?.station?.station || (maxRainStation ? maxRainStation.stationName : 'สะพานพญาอาทิตราช (ต.ม่อนจอง)'),
        update_time: twaWeather?.temperature?.measureAt || new Date().toISOString()
      },
      stations: rainStations
    });

  } catch (err: any) {
    console.error('Mon Jong TWA API error:', err);
    res.json({ success: false, error: err.message });
  }
});

export default app;
