const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello!'));
app.get('/api/products', (req, res) => {
  res.json([{ id: 1, name: 'Sample Product' }]);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
