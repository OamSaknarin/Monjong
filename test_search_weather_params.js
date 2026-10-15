async function testParams(params) {
  const baseURL = 'https://twa-api-public.thaiwater.net/v2/weather/list';
  const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
  const query = new URLSearchParams(params).toString();
  const url = `${baseURL}?${query}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        'x-api-key': apiKey
      }
    });
    const json = await res.json();
    return {
      status: res.status,
      count: json.data ? json.data.length : 0,
      totalItems: json.meta?.pagination?.totalItems || 0,
      provinces: json.data ? [...new Set(json.data.map(st => st.geoCode?.province || ''))] : []
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function main() {
  const paramSets = [
    { provinceCode: '50' },
    { province: 'เชียงใหม่' },
    { areaCode: '3' },
    { limit: 100 },
    { page: 1, pageSize: 100 },
    { stationName: 'ม่อนจอง' },
    { q: 'ม่อนจอง' },
    { s: 'ม่อนจอง' }
  ];

  for (const set of paramSets) {
    const res = await testParams(set);
    console.log(`Params: ${JSON.stringify(set)}`);
    console.log(`  Result:`, res);
    console.log('--------------------------------------------------');
  }
}

main();
