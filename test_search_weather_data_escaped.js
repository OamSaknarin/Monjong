import fs from 'fs';

function toUnicodeEscape(str) {
  return str.split('').map(char => {
    const code = char.charCodeAt(0).toString(16).padStart(4, '0');
    return '\\u' + code;
  }).join('');
}

function main() {
  const content = fs.readFileSync('all_next_f.txt', 'utf8');
  
  const terms = ['ม่อนจอง', 'อมก๋อย', 'อุณหภูมิ', 'ความชื้น', 'น้ำฝน'];
  
  console.log('Searching in all_next_f.txt:');
  terms.forEach(term => {
    const unicode = toUnicodeEscape(term);
    const urlEncoded = encodeURIComponent(term);
    
    // Check unicode escape
    let uCount = 0;
    let idx = 0;
    while ((idx = content.indexOf(unicode, idx)) !== -1) {
      uCount++;
      idx += unicode.length;
    }
    
    // Check URL encoding
    let urlCount = 0;
    idx = 0;
    while ((idx = content.indexOf(urlEncoded, idx)) !== -1) {
      urlCount++;
      idx += urlEncoded.length;
    }
    
    console.log(`- "${term}": unicode escape (${unicode}) found ${uCount} times, URL encoded (${urlEncoded}) found ${urlCount} times.`);
  });
}

main();
