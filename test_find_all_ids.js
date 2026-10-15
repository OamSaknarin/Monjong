import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_next_f.txt', 'utf8');
  
  // Find all 6 digit numbers
  const regex = /\b\d{6}\b/g;
  const matches = [...new Set(content.match(regex))];
  
  console.log(`Found ${matches.length} unique 6-digit numbers in all_next_f.txt:`);
  console.log(matches.slice(0, 50));
  
  // Let's also search for 501804 in all_next_f.txt
  console.log('Includes 501804:', content.includes('501804'));
}

main();
