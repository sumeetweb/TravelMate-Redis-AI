const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redisService = require('../services/redis');
const openaiService = require('../services/openai');
const cacheService = require('../services/cache');

const router = express.Router();

// POST /api/stream/query - Stream travel query with real-time updates
router.post('/query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { location, categories, duration, preferences = {} } = req.body;
    
    // Validate required fields
    if (!location || !categories || !duration) {
      return res.status(400).json({
        error: 'Missing required fields: location, categories, duration'
      });
    }

    const queryId = uuidv4();
    const sessionId = req.headers['x-session-id'] || uuidv4();
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      queryId,
      sessionId,
      timestamp: Date.now()
    })}\n\n`);

    const queryData = {
      query_id: queryId,
      location,
      categories,
      duration,
      preferences,
      timestamp: Date.now()
    };

    // Send processing started event
    res.write(`data: ${JSON.stringify({
      type: 'processing_started',
      message: 'Checking semantic cache...',
      timestamp: Date.now()
    })}\n\n`);

    // Check semantic cache
    const cacheResult = await cacheService.findSimilarCachedResponse(queryData);
    
    if (cacheResult.cacheHit) {
      // Send cache hit event
      res.write(`data: ${JSON.stringify({
        type: 'cache_hit',
        message: `Found similar query with ${cacheResult.similarity.toFixed(3)} similarity`,
        similarity: cacheResult.similarity,
        searchTime: cacheResult.searchTime,
        timestamp: Date.now()
      })}\n\n`);

      const responseTime = Date.now() - startTime;
      
      // Send final result
      const finalResponse = {
        ...cacheResult.response,
        response_time_ms: responseTime,
        cache_hit: true,
        similarity: cacheResult.similarity
      };

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        response: finalResponse,
        timestamp: Date.now()
      })}\n\n`);

      // Log metrics
      await Promise.all([
        redisService.addMetric('response_times', Date.now(), responseTime, {
          cache_hit: 'true',
          location: location
        }),
        redisService.logInteraction('user_queries', {
          query_id: queryId,
          session_id: sessionId,
          location,
          categories: categories.join(','),
          duration: duration.toString(),
          cache_hit: 'true',
          response_time_ms: responseTime.toString(),
          similarity: cacheResult.similarity.toString()
        })
      ]);

    } else {
      // Send cache miss event
      res.write(`data: ${JSON.stringify({
        type: 'cache_miss',
        message: 'No similar queries found, generating new itinerary...',
        searchTime: cacheResult.searchTime,
        timestamp: Date.now()
      })}\n\n`);

      // Generate new itinerary with streaming
      let fullItinerary = '';
      
      await openaiService.generateItineraryStream(queryData, (update) => {
        switch (update.type) {
          case 'content':
            res.write(`data: ${JSON.stringify({
              type: 'content_chunk',
              content: update.content,
              fullContent: update.fullContent,
              timestamp: Date.now()
            })}\n\n`);
            break;
            
          case 'complete':
            fullItinerary = update.content;
            console.log('Stream complete - fullItinerary type:', typeof fullItinerary);
            console.log('Stream complete - fullItinerary preview:', fullItinerary?.substring ? fullItinerary.substring(0, 200) + '...' : fullItinerary);
            break;
            
          case 'error':
            res.write(`data: ${JSON.stringify({
              type: 'error',
              error: update.error,
              timestamp: Date.now()
            })}\n\n`);
            return;
        }
      });

      const responseTime = Date.now() - startTime;
      
      // Create response object
      const response = {
        response_id: uuidv4(),
        query_id: queryId,
        generated_at: new Date().toISOString(),
        response_time_ms: responseTime,
        cache_hit: false,
        itinerary: fullItinerary
      };

      console.log('Final response object - itinerary type:', typeof response.itinerary);
      console.log('Final response object - itinerary keys:', response.itinerary ? Object.keys(response.itinerary) : 'null');
      console.log('Final response object - day_1 exists:', response.itinerary?.day_1 ? 'yes' : 'no');
      if (response.itinerary?.day_1) {
        console.log('Final response object - day_1 length:', response.itinerary.day_1.length);
        console.log('Final response object - first activity:', response.itinerary.day_1[0]);
      }

      // Store in cache for future use
      await cacheService.storeInCache(queryData, response);

      // Send final result
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        response: response,
        timestamp: Date.now()
      })}\n\n`);

      // Log metrics
      await Promise.all([
        redisService.addMetric('response_times', Date.now(), responseTime, {
          cache_hit: 'false',
          location: location
        }),
        redisService.logInteraction('user_queries', {
          query_id: queryId,
          session_id: sessionId,
          location,
          categories: categories.join(','),
          duration: duration.toString(),
          cache_hit: 'false',
          response_time_ms: responseTime.toString()
        })
      ]);
    }

    // Send session end event
    res.write(`data: ${JSON.stringify({
      type: 'session_end',
      queryId,
      totalTime: Date.now() - startTime,
      timestamp: Date.now()
    })}\n\n`);

    res.end();
    
  } catch (error) {
    console.error('Error in streaming query:', error);
    
    const responseTime = Date.now() - startTime;
    await redisService.addMetric('error_count', Date.now(), 1, {
      error_type: error.name || 'unknown',
      endpoint: 'stream_query'
    });

    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: Date.now()
    })}\n\n`);

    res.end();
  }
});

// GET /api/stream/metrics - Stream real-time metrics
router.get('/metrics', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial metrics
  const sendMetrics = async () => {
    try {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      const [responseTimes, cacheStats] = await Promise.all([
        redisService.getMetrics('response_times', oneHourAgo, now),
        cacheService.getCacheStats()
      ]);
      
      // Calculate average response time
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, metric) => sum + metric.value, 0) / responseTimes.length
        : 0;
      
      const metrics = {
        avgResponseTime: Math.round(avgResponseTime),
        cacheHitRate: cacheStats.hitRate,
        totalQueries: cacheStats.totalRequests,
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        timestamp: now
      };
      
      console.log('Sending metrics update:', metrics);
      
      res.write(`data: ${JSON.stringify({
        type: 'metrics_update',
        metrics,
        timestamp: now
      })}\n\n`);
      
    } catch (error) {
      console.error('Error sending metrics:', error);
      // Send error metrics to indicate the problem
      res.write(`data: ${JSON.stringify({
        type: 'metrics_error',
        error: error.message,
        timestamp: Date.now()
      })}\n\n`);
    }
  };

  // Send initial metrics
  await sendMetrics();
  
  // Set up periodic updates every 5 seconds
  const metricsInterval = setInterval(sendMetrics, 5000);
  
  // Clean up on client disconnect or error
  const cleanup = () => {
    console.log('Cleaning up metrics streaming connection');
    clearInterval(metricsInterval);
  };
  
  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
  
  // Send keep-alive ping every 30 seconds
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      })}\n\n`);
    } catch (error) {
      console.error('Keep-alive failed:', error);
      cleanup();
    }
  }, 30000);
  
  // Update cleanup to also clear keep-alive
  const originalCleanup = cleanup;
  const enhancedCleanup = () => {
    clearInterval(keepAliveInterval);
    originalCleanup();
  };
  
  req.on('close', enhancedCleanup);
  req.on('error', enhancedCleanup);
  res.on('close', enhancedCleanup);
  res.on('error', enhancedCleanup);
});

module.exports = router;