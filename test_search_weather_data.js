import fs from 'fs';

function main() {
  const content = fs.readFileSync('all_next_f.txt', 'utf8');
  console.log('Searching in all_next_f.txt:');
  
  const searchTerms = ['ม่อนจอง', 'อมก๋อย', '501804', 'อุณหภูมิ', 'ความชื้น', 'น้ำฝน'];
  searchTerms.forEach(term => {
    let count = 0;
    let idx = 0;
    while ((idx = content.indexOf(term, idx)) !== -1) {
      count++;
      idx += term.length;
    }
    console.log(`- "${term}": ${count} occurrences`);
  });

  const htmlContent = fs.readFileSync('station_page_v4.html', 'utf8');
  console.log('\nSearching in station_page_v4.html:');
  searchTerms.forEach(term => {
    let count = 0;
    let idx = 0;
    while ((idx = htmlContent.indexOf(term, idx)) !== -1) {
      count++;
      idx += term.length;
    }
    console.log(`- "${term}": ${count} occurrences`);
  });
}

main();
