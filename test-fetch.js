const url = "https://script.google.com/macros/s/AKfycbzbo78J3WjbNHNIdxWkAvm6J2eR-5OSbnhaC7V06SdqfcBgHOtO9Mc0ZAt38HrsdZWBAg/exec";
const data = JSON.stringify({"action":"fetchData","payload":{}});

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8'
  },
  body: data,
  redirect: 'follow'
}).then(res => res.text()).then(text => console.log(text)).catch(err => console.error(err));
