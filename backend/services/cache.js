const redisService = require('./redis');
const openaiService = require('./openai');

class SemanticCacheService {
  constructor() {
    this.similarityThreshold = 0.95; // Balanced threshold for precise but practical matches
    this.cacheExpiry = 3600; // 1 hour in seconds
  }

  // Generate cache key from query data
  generateCacheKey(queryData) {
    const { location, categories, duration, preferences } = queryData;
    
    // Create normalized key components
    const normalizedLocation = location.toLowerCase().trim();
    const sortedCategories = [...categories].sort().join(',');
    const budget = preferences.budget || 'any';
    const dietary = preferences.dietary ? [...preferences.dietary].sort().join(',') : 'none';
    const accessibility = preferences.accessibility ? 'accessible' : 'standard';
    
    return `cache:${normalizedLocation}:${sortedCategories}:${duration}:${budget}:${dietary}:${accessibility}`;
  }

  // Check if two queries have compatible parameters for caching
  areQueriesCompatible(query1, query2) {
    // Duration must match exactly
    if (query1.duration !== query2.duration) {
      return false;
    }
    
    // Budget must match (treating null/undefined as 'any')
    const budget1 = query1.preferences?.budget || 'any';
    const budget2 = query2.preferences?.budget || 'any';
    if (budget1 !== budget2) {
      return false;
    }
    
    // Categories must have significant overlap (at least 60% match)
    const categories1 = new Set(query1.categories || []);
    const categories2 = new Set(query2.categories || []);
    
    if (categories1.size === 0 && categories2.size === 0) {
      // Both have no categories - compatible
    } else if (categories1.size === 0 || categories2.size === 0) {
      // One has categories, other doesn't - still potentially compatible for location-based matches
      // Allow if the similarity threshold is high enough to compensate
    } else {
      const intersection = new Set([...categories1].filter(x => categories2.has(x)));
      const union = new Set([...categories1, ...categories2]);
      const overlapRatio = intersection.size / union.size;
      
      if (overlapRatio < 0.6) {
        return false;
      }
    }
    
    // Dietary requirements must match exactly
    const dietary1 = new Set(query1.preferences?.dietary || []);
    const dietary2 = new Set(query2.preferences?.dietary || []);
    
    if (dietary1.size !== dietary2.size) {
      return false;
    }
    
    for (const diet of dietary1) {
      if (!dietary2.has(diet)) {
        return false;
      }
    }
    
    // Accessibility must match exactly
    const accessibility1 = query1.preferences?.accessibility || false;
    const accessibility2 = query2.preferences?.accessibility || false;
    if (accessibility1 !== accessibility2) {
      return false;
    }
    
    return true;
  }

  // Check for semantically similar cached responses
  async findSimilarCachedResponse(queryData) {
    try {
      const startTime = Date.now();
      
      // Generate embedding for the current query
      const queryString = openaiService.createQueryString(queryData);
      const embedding = await openaiService.generateEmbedding(queryString);
      
      // Search for similar queries using vector search
      const similarQueries = await redisService.findSimilarQueries(embedding, this.similarityThreshold);
      
      const searchTime = Date.now() - startTime;
      console.log(`Semantic search completed in ${searchTime}ms, found ${similarQueries.length} similar queries`);
      
      if (similarQueries.length > 0) {
        // Get the most similar query and validate parameter compatibility
        const mostSimilar = similarQueries[0];
        const similarity = parseFloat(mostSimilar.value.score);
        
        console.log(`Most similar query has ${similarity} similarity score`);
        
        // Get the cached query data to validate parameter compatibility
        const queryId = mostSimilar.id.replace('query:', '');
        const cachedQuery = await redisService.getQuery(queryId);
        
        if (cachedQuery && this.areQueriesCompatible(queryData, cachedQuery)) {
          const cachedResponse = await redisService.getCachedResponse(queryId);
          
          if (cachedResponse) {
            console.log(`Cache hit validated - parameters are compatible`);
            
            // Log cache hit metrics with detailed parameter info
            await redisService.addMetric('cache_hits', Date.now(), 1, {
              similarity: similarity.toString(),
              location: queryData.location,
              duration: queryData.duration.toString(),
              categories: queryData.categories.join(','),
              budget: queryData.preferences.budget || 'any'
            });
            
            return {
              response: cachedResponse,
              similarity,
              cacheHit: true,
              searchTime
            };
          }
        } else {
          console.log(`Cache hit rejected - parameters are not compatible`);
          console.log(`Current query:`, queryData);
          console.log(`Cached query:`, cachedQuery);
        }
      }
      
      // Log cache miss
      await redisService.addMetric('cache_misses', Date.now(), 1, {
        location: queryData.location
      });
      
      return {
        response: null,
        similarity: 0,
        cacheHit: false,
        searchTime
      };
      
    } catch (error) {
      console.error('Error in semantic cache lookup:', error);
      return {
        response: null,
        similarity: 0,
        cacheHit: false,
        searchTime: 0,
        error: error.message
      };
    }
  }

  // Store query and response in cache
  async storeInCache(queryData, response) {
    try {
      const startTime = Date.now();
      
      // Generate embedding if not already present
      if (!queryData.embedding) {
        const queryString = openaiService.createQueryString(queryData);
        queryData.embedding = await openaiService.generateEmbedding(queryString);
      }
      
      // Store query with embedding for future similarity searches
      await redisService.storeQuery(queryData.query_id, queryData);
      
      // Store response using query_id as key so it can be found later
      await redisService.storeResponse(queryData.query_id, response);
      
      // Set TTL for cache expiry
      const queryKey = `query:${queryData.query_id}`;
      const responseKey = `response:${queryData.query_id}`;
      
      await Promise.all([
        redisService.client.expire(queryKey, this.cacheExpiry),
        redisService.client.expire(responseKey, this.cacheExpiry)
      ]);
      
      const storeTime = Date.now() - startTime;
      console.log(`Stored in cache in ${storeTime}ms`);
      
      // Log storage metrics
      await redisService.addMetric('cache_stores', Date.now(), 1, {
        location: queryData.location,
        categories: queryData.categories.join(',')
      });
      
      return true;
      
    } catch (error) {
      console.error('Error storing in cache:', error);
      return false;
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      const [hits, misses, stores] = await Promise.all([
        redisService.getMetrics('cache_hits', oneHourAgo, now),
        redisService.getMetrics('cache_misses', oneHourAgo, now),
        redisService.getMetrics('cache_stores', oneHourAgo, now)
      ]);
      
      const totalHits = hits.reduce((sum, metric) => sum + metric.value, 0);
      const totalMisses = misses.reduce((sum, metric) => sum + metric.value, 0);
      const totalStores = stores.reduce((sum, metric) => sum + metric.value, 0);
      
      const totalRequests = totalHits + totalMisses;
      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
      
      return {
        hits: totalHits,
        misses: totalMisses,
        stores: totalStores,
        hitRate: Math.round(hitRate * 100) / 100,
        totalRequests
      };
      
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        hits: 0,
        misses: 0,
        stores: 0,
        hitRate: 0,
        totalRequests: 0
      };
    }
  }

  // Clear expired cache entries
  async cleanupExpiredCache() {
    try {
      const now = Date.now();
      const expiredTime = now - (this.cacheExpiry * 1000);
      
      // Find expired queries
      const expiredQueries = await redisService.client.ft.search('idx:queries', 
        `@timestamp:[0 ${expiredTime}]`
      );
      
      if (expiredQueries.documents.length > 0) {
        const deletePromises = [];
        
        for (const doc of expiredQueries.documents) {
          const queryId = doc.id.replace('query:', '');
          deletePromises.push(
            redisService.client.del(`query:${queryId}`, `response:${queryId}`)
          );
        }
        
        await Promise.all(deletePromises);
        console.log(`Cleaned up ${expiredQueries.documents.length} expired cache entries`);
      }
      
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  // Clear all cached data
  async clearCache() {
    await redisService.clearCache();
  }

  // Preload popular destinations cache
  async preloadPopularDestinations() {
    const popularDestinations = [
      // {
      //   location: 'Paris, France',
      //   categories: ['attractions', 'dining'],
      //   duration: 3,
      //   preferences: { budget: 'mid-range' }
      // },
      // {
      //   location: 'Tokyo, Japan',
      //   categories: ['dining', 'activities'],
      //   duration: 5,
      //   preferences: { budget: 'mid-range' }
      // },
      // {
      //   location: 'New York, USA',
      //   categories: ['attractions', 'activities'],
      //   duration: 4,
      //   preferences: { budget: 'mid-range' }
      // }
    ];
    
    console.log('Preloading cache for popular destinations...');
    
    for (const destination of popularDestinations) {
      try {
        const queryString = openaiService.createQueryString(destination);
        const embedding = await openaiService.generateEmbedding(queryString);
        
        // Check if already cached
        const similar = await redisService.findSimilarQueries(embedding, 0.95);
        
        if (similar.length === 0) {
          const queryData = {
            query_id: `preload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...destination,
            embedding,
            timestamp: Date.now(),
            preloaded: true
          };
          
          const itinerary = await openaiService.generateItinerary(destination);
          
          const response = {
            response_id: queryData.query_id, // Use query_id as response_id for consistency
            query_id: queryData.query_id,
            generated_at: new Date().toISOString(),
            cache_hit: false,
            preloaded: true,
            itinerary
          };
          
          await this.storeInCache(queryData, response);
          console.log(`Preloaded cache for ${destination.location}`);
        }
        
      } catch (error) {
        console.error(`Error preloading ${destination.location}:`, error);
      }
    }
    
    console.log('Cache preloading completed');
  }
}

module.exports = new SemanticCacheService();