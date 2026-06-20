const fetch = require('node-fetch');
fetch('http://localhost:5500/api/pw?url=https://api.penpencil.co/v3/batches/6779345c20fa0756e4a7fd08/details')
  .then(r => r.json())
  .then(data => console.log("Result:", data.success ? "Success" : "Failed", Object.keys(data)))
  .catch(console.error);
