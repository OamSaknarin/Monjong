import fs from 'fs';

function main() {
  const content = fs.readFileSync('script_68.js', 'utf8');
  console.log('script_68.js length:', content.length);
  console.log('First 400 chars:', content.substring(0, 400));
  console.log('Last 400 chars:', content.substring(content.length - 400));
  
  // Search for some potential data-bearing structures
  const keys = ['self.__next_f', 'push', 'initialState', 'window.__NEXT_DATA__'];
  keys.forEach(k => {
    console.log(`Includes "${k}":`, content.includes(k));
  });
}

main();
