const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redisService = require('../services/redis');
const openaiService = require('../services/openai');
const cacheService = require('../services/cache');

const router = express.Router();

// POST /api/travel/query - Process travel query
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
    const queryData = {
      query_id: queryId,
      location,
      categories,
      duration,
      preferences,
      timestamp: Date.now()
    };

    // Use semantic cache service
    const cacheResult = await cacheService.findSimilarCachedResponse(queryData);
    
    let response;
    
    if (cacheResult.cacheHit) {
      response = cacheResult.response;
      console.log(`Cache hit for query: ${queryId} with similarity: ${cacheResult.similarity}`);
    } else {
      // Generate new response
      console.log(`Generating new response for query: ${queryId}`);
      const itinerary = await openaiService.generateItinerary(queryData);
      
      response = {
        response_id: uuidv4(),
        query_id: queryId,
        generated_at: new Date().toISOString(),
        cache_hit: false,
        itinerary
      };
      
      // Store in cache using semantic cache service
      await cacheService.storeInCache(queryData, response);
    }
    
    const responseTime = Date.now() - startTime;
    response.response_time_ms = responseTime;
    response.cache_hit = cacheResult.cacheHit;
    if (cacheResult.similarity) {
      response.similarity = cacheResult.similarity;
    }
    
    // Log metrics
    await redisService.addMetric('response_times', Date.now(), responseTime, {
      cache_hit: cacheResult.cacheHit ? 'true' : 'false',
      location: location
    });
    
    await redisService.logInteraction('user_queries', {
      query_id: queryId,
      location,
      categories: categories.join(','),
      duration: duration.toString(),
      cache_hit: cacheResult.cacheHit ? 'true' : 'false',
      response_time_ms: responseTime.toString(),
      similarity: cacheResult.similarity ? cacheResult.similarity.toString() : '0'
    });

    res.json(response);
    
  } catch (error) {
    console.error('Error processing travel query:', error);
    
    const responseTime = Date.now() - startTime;
    await redisService.addMetric('error_count', Date.now(), 1, {
      error_type: error.name || 'unknown'
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/travel/metrics - Get performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    console.log('Fetching metrics...');
    const [responseTimes, errorCounts, cacheStats] = await Promise.all([
      redisService.getMetrics('response_times', oneHourAgo, now),
      redisService.getMetrics('error_count', oneHourAgo, now),
      cacheService.getCacheStats()
    ]);
    
    console.log(`Response times: ${responseTimes.length} entries`);
    console.log(`Error counts: ${errorCounts.length} entries`);
    console.log(`Cache stats:`, cacheStats);
    
    // Calculate average response times
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, metric) => sum + metric.value, 0) / responseTimes.length
      : 0;
    
    const totalErrors = errorCounts.reduce((sum, metric) => sum + metric.value, 0);
    
    const result = {
      response_times: responseTimes,
      avg_response_time: Math.round(avgResponseTime),
      error_counts: errorCounts,
      total_errors: totalErrors,
      cache_stats: cacheStats,
      cache_hit_rate: cacheStats.hitRate,
      total_queries: cacheStats.totalRequests
    };
    
    console.log('Sending metrics:', result);
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

// POST /api/travel/clear-cache - Clear all cached data
router.post('/clear-cache', async (req, res) => {
  try {
    await cacheService.clearCache();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// GET /api/travel/categories - Get available place categories
router.get('/categories', (req, res) => {
  const categories = [
    {
      id: 'attractions',
      name: 'Attractions',
      subcategories: ['Museums', 'Landmarks', 'Parks', 'Historical Sites']
    },
    {
      id: 'dining',
      name: 'Dining',
      subcategories: ['Restaurants', 'Cafes', 'Street Food', 'Bars', 'Local Cuisine']
    },
    {
      id: 'activities',
      name: 'Activities',
      subcategories: ['Tours', 'Shopping', 'Nightlife', 'Sports', 'Entertainment']
    },
    {
      id: 'accommodation',
      name: 'Accommodation',
      subcategories: ['Hotels', 'Hostels', 'Unique Stays']
    },
    {
      id: 'transportation',
      name: 'Transportation',
      subcategories: ['Public Transit', 'Car Rentals', 'Walking Routes']
    }
  ];
  
  res.json(categories);
});

module.exports = router;