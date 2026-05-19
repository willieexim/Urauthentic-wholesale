const express = require('express');
const app = express();

const PORT = process.env.PORT || 10000;
app.get('/api/products', (req, res) => {
  res.json([{ id: 1, name: 'Sample Product' }]);
});
app.listen(PORT, () => console.log("Server running on port " + PORT));
