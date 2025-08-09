require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const redisService = require('./services/redis');
const cacheService = require('./services/cache');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/travel', require('./routes/travel'));
app.use('/api/stream', require('./routes/stream'));

// WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

const PORT = process.env.PORT || 3001;

// Initialize services
async function initializeServer() {
  try {
    console.log('Initializing Redis services...');
    await redisService.initialize();
    
    console.log('Preloading popular destinations cache...');
    await cacheService.preloadPopularDestinations();
    
    server.listen(PORT, () => {
      console.log(`TravelMate server running on port ${PORT}`);
      console.log('Redis Stack features enabled:');
      console.log('- Vector Search for semantic caching');
      console.log('- JSON for complex data storage');
      console.log('- Pub/Sub for real-time updates');
      console.log('- Streams for interaction logging');
      console.log('- TimeSeries for performance metrics');
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

initializeServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await redisService.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});