const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || 'dev';

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from my CI/CD pipeline project!',
    version: VERSION,
    env: process.env.NODE_ENV || 'development',
  });
});

// Health check endpoint - used by Docker, Nginx, and deploy scripts
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
