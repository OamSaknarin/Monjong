import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_next_f.txt', 'utf8');
  
  const regex = /https?:\/\/[^\s"'}]+/g;
  const matches = [...new Set(content.match(regex))];
  
  console.log(`Found ${matches.length} unique URLs in all_next_f.txt:`);
  console.log(matches.slice(0, 50));
  
  // Also search for any api domains
  const apiMatches = matches.filter(url => url.includes('api') || url.includes('thaiwater'));
  console.log('\nAPI / Thaiwater URLs found:');
  console.log(apiMatches);
}

main();
