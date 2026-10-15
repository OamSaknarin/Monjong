import fs from 'fs';

async function main() {
  const url = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h';
  try {
    const res = await fetch(url);
    const json = await res.json();
    
    if (Array.isArray(json.data)) {
      const searchTerms = ['501804', 'ม่อนจอง', 'อมก๋อย'];
      
      const monjongMatches = json.data.filter(item => {
        const itemStr = JSON.stringify(item);
        return searchTerms.some(term => itemStr.includes(term));
      });
      
      console.log(`Found ${monjongMatches.length} matching Mon Jong/Omkoi stations in rain_24h:`);
      console.log(JSON.stringify(monjongMatches, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
