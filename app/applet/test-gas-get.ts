import fetch from 'node-fetch';

async function run() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbzxO0YCP0GZQHTKOuyqK0r93pZyq5vsx6fI8o-m42d2-_Dx3JYadreu4LxDYE8AWNob2A/exec?action=getAllData');
  console.log('status:', res.status);
  const text = await res.text();
  console.log('response:', text.substring(0, 200));
}

run();
