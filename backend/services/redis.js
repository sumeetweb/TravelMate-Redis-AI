const redisClient = require('../../config/redis');

class RedisService {
  constructor() {
    this.client = null;
  }

  async initialize() {
    this.client = await redisClient.connect();
    await this.setupIndices();
  }

  async setupIndices() {
    try {
      // Create vector search index for semantic caching
      await this.client.ft.create('idx:queries', {
        '$.embedding': {
          type: 'VECTOR',
          ALGORITHM: 'HNSW',
          TYPE: 'FLOAT32',
          DIM: 1536, // OpenAI embedding dimension
          DISTANCE_METRIC: 'COSINE',
          AS: 'embedding'
        },
        '$.location': {
          type: 'TEXT',
          AS: 'location'
        },
        '$.categories': {
          type: 'TAG',
          AS: 'categories'
        },
        '$.duration': {
          type: 'NUMERIC',
          AS: 'duration'
        },
        '$.timestamp': {
          type: 'NUMERIC',
          AS: 'timestamp'
        }
      }, {
        ON: 'JSON',
        PREFIX: 'query:'
      });
      console.log('Created query vector index');
    } catch (error) {
      if (error.message.includes('Index already exists')) {
        console.log('Query index already exists');
      } else {
        console.error('Error creating query index:', error);
      }
    }

    try {
      // Create index for itinerary responses
      await this.client.ft.create('idx:responses', {
        '$.query_id': {
          type: 'TEXT',
          AS: 'query_id'
        },
        '$.cache_hit': {
          type: 'TAG',
          AS: 'cache_hit'
        },
        '$.response_time_ms': {
          type: 'NUMERIC',
          AS: 'response_time_ms'
        },
        '$.timestamp': {
          type: 'NUMERIC',
          AS: 'timestamp'
        }
      }, {
        ON: 'JSON',
        PREFIX: 'response:'
      });
      console.log('Created response index');
    } catch (error) {
      if (error.message.includes('Index already exists')) {
        console.log('Response index already exists');
      } else {
        console.error('Error creating response index:', error);
      }
    }
  }

  // Vector search for semantic similarity
  async findSimilarQueries(embedding, threshold = 0.75) {
    try {
      const results = await this.client.ft.search('idx:queries', 
        `*=>[KNN 10 @embedding $vec AS score]`,
        {
          PARAMS: {
            vec: Buffer.from(new Float32Array(embedding).buffer)
          },
          RETURN: ['score', 'location', 'categories', 'duration', 'timestamp'],
          SORTBY: 'score',
          DIALECT: 2
        }
      );

      console.log(`Vector search found ${results.documents.length} candidates`);
      
      // Log the scores for debugging
      results.documents.forEach((doc, index) => {
        const score = parseFloat(doc.value.score);
        console.log(`Candidate ${index + 1}: score=${score}, location=${doc.value.location}`);
      });

      // For cosine similarity, scores closer to 1 are more similar
      // But Redis returns distance, so smaller values are more similar
      // Let's convert distance to similarity: similarity = 1 - distance
      const filtered = results.documents.filter(doc => {
        const distance = parseFloat(doc.value.score);
        const similarity = 1 - distance;
        console.log(`Distance: ${distance}, Similarity: ${similarity}, Threshold: ${threshold}`);
        return similarity >= threshold;
      }).map(doc => ({
        ...doc,
        value: {
          ...doc.value,
          score: (1 - parseFloat(doc.value.score)).toString() // Convert to similarity
        }
      }));

      console.log(`Found ${filtered.length} queries above similarity threshold ${threshold} out of ${results.documents.length} candidates`);
      return filtered;
    } catch (error) {
      console.error('Error searching similar queries:', error);
      return [];
    }
  }

  // Store query with embedding
  async storeQuery(queryId, queryData) {
    try {
      await this.client.json.set(`query:${queryId}`, '$', queryData);
      console.log(`Stored query: ${queryId}`);
    } catch (error) {
      console.error('Error storing query:', error);
      throw error;
    }
  }

  // Store itinerary response
  async storeResponse(responseId, responseData) {
    try {
      await this.client.json.set(`response:${responseId}`, '$', responseData);
      console.log(`Stored response: ${responseId}`);
    } catch (error) {
      console.error('Error storing response:', error);
      throw error;
    }
  }

  // Get cached query data
  async getQuery(queryId) {
    try {
      const query = await this.client.json.get(`query:${queryId}`);
      return query;
    } catch (error) {
      console.error('Error getting cached query:', error);
      return null;
    }
  }

  // Get cached response
  async getCachedResponse(queryId) {
    try {
      const response = await this.client.json.get(`response:${queryId}`);
      return response;
    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  // Pub/Sub for real-time updates
  async publishUpdate(channel, data) {
    try {
      await this.client.publish(channel, JSON.stringify(data));
    } catch (error) {
      console.error('Error publishing update:', error);
    }
  }

  // Subscribe to updates
  async subscribe(channel, callback) {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(channel, (message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        console.error('Error parsing subscription message:', error);
      }
    });

    return subscriber;
  }

  // Log interaction to streams
  async logInteraction(streamKey, data) {
    try {
      await this.client.xAdd(streamKey, '*', data);
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  }

  // Add time series data
  async addMetric(key, timestamp, value, labels = {}) {
    try {
      // Check if TimeSeries module is available
      if (!this.client.ts) {
        console.warn('Redis TimeSeries module not available, using fallback for metric:', key);
        // Fallback: Store in a simple list with TTL
        const fallbackKey = `fallback_metrics:${key}`;
        const data = JSON.stringify({ timestamp, value, labels });
        await this.client.lpush(fallbackKey, data);
        await this.client.ltrim(fallbackKey, 0, 999); // Keep last 1000 entries
        await this.client.expire(fallbackKey, 3600); // 1 hour TTL
        return;
      }
      
      await this.client.ts.add(key, timestamp, value, {
        LABELS: labels
      });
    } catch (error) {
      if (error.message.includes('TSDB: key does not exist')) {
        // Create the time series if it doesn't exist
        try {
          await this.client.ts.create(key, {
            LABELS: labels
          });
          await this.client.ts.add(key, timestamp, value);
        } catch (createError) {
          console.error('Error creating time series:', createError);
        }
      } else if (error.message.includes("Couldn't parse LABELS")) {
        // Try without labels if parsing fails
        try {
          await this.client.ts.add(key, timestamp, value);
        } catch (retryError) {
          console.error('Error adding metric (retry):', retryError);
        }
      } else {
        console.error('Error adding metric:', error);
      }
    }
  }

  // Get time series data
  async getMetrics(key, fromTimestamp, toTimestamp) {
    try {
      // Check if TimeSeries module is available
      if (!this.client.ts) {
        console.warn('Redis TimeSeries module not available, using fallback for metrics:', key);
        // Fallback: Get from list
        const fallbackKey = `fallback_metrics:${key}`;
        const rawData = await this.client.lrange(fallbackKey, 0, -1);
        
        const metrics = rawData.map(item => {
          try {
            const parsed = JSON.parse(item);
            return { 
              timestamp: parsed.timestamp, 
              value: parsed.value,
              labels: parsed.labels || {}
            };
          } catch (parseError) {
            console.error('Error parsing fallback metric:', parseError);
            return null;
          }
        }).filter(item => item !== null);
        
        // Filter by timestamp range
        return metrics.filter(metric => 
          metric.timestamp >= fromTimestamp && metric.timestamp <= toTimestamp
        );
      }
      
      return await this.client.ts.range(key, fromTimestamp, toTimestamp);
    } catch (error) {
      if (error.message.includes('TSDB: key does not exist')) {
        console.log(`Time series key does not exist: ${key}`);
        return [];
      }
      console.error('Error getting metrics:', error);
      return [];
    }
  }

  // Clear all cached data
  async clearCache() {
    try {
      const queryKeys = await this.client.keys('query:*');
      const responseKeys = await this.client.keys('response:*');
      const allKeys = [...queryKeys, ...responseKeys];
      
      if (allKeys.length > 0) {
        await this.client.del(allKeys);
        console.log(`Cleared ${allKeys.length} cached items (${queryKeys.length} queries, ${responseKeys.length} responses)`);
      } else {
        console.log('No cache items to clear');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Disconnect from Redis
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

module.exports = new RedisService();