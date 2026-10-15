async function main() {
  const baseURL = 'https://twa-api-public.thaiwater.net';
  const apiKey = 'TPSXrHRvTHeVT2Lygq6YeTqqAm4xZ72x';
  
  const testParams = [
    'perPage=50',
    'per_page=50',
    'limit=50',
    'itemsPerPage=50',
    'size=50',
    'pageSize=50',
    'pagesize=50',
    'rowPerPage=50',
    'rowsPerPage=50',
    'max=50'
  ];

  for (const param of testParams) {
    const url = `${baseURL}/v2/weather/list?${param}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0',
          'x-api-key': apiKey
        }
      });
      const json = await res.json();
      console.log(`Param "${param}": status=${res.status}, data.length=${json.data ? json.data.length : 'N/A'}, meta.pagination=${json.meta?.pagination ? JSON.stringify(json.meta.pagination) : 'N/A'}, pagination=${json.pagination ? JSON.stringify(json.pagination) : 'N/A'}`);
    } catch (err) {
      console.error(`Param "${param}" Error:`, err.message);
    }
  }
}

main();
