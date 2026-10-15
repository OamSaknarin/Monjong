const url = "https://script.google.com/macros/s/AKfycbzbo78J3WjbNHNIdxWkAvm6J2eR-5OSbnhaC7V06SdqfcBgHOtO9Mc0ZAt38HrsdZWBAg/exec";
const payload = {
  action: "saveData",
  payload: {
    locations: [
      { id: "test1", name: "Test Loc", details: "Details", lat: 10.5, lng: 20.5 }
    ]
  }
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(data => console.log("Save Response:", JSON.stringify(data)))
.catch(e => console.error("Error:", e));
