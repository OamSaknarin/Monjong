async function run() {
  const url = 'https://script.google.com/macros/s/AKfycbzjvo-_vEsKTajuh-sLEO2ldj4eY9P5hIpOoU1ESx7tI342U3FrkFLaa2G4hjjFJYamKg/exec';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'fetchData', payload: {} })
  });
  console.log('status:', res.status);
  const text = await res.text();
  console.log('response:', text.slice(0, 1500));
}

run();

