const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Generate embeddings for semantic search
  async generateEmbedding(text) {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Helper method to generate system prompt for itinerary generation
  _getItinerarySystemPrompt() {
    return `You are TravelMate AI, an expert local travel guide. Generate detailed, practical itineraries based on user preferences.

Guidelines:
- Create day-by-day plans for the specified duration
- Include specific place names, not generic descriptions
- Provide estimated time needed and cost ranges
- Consider location proximity for efficient routing
- Respect dietary restrictions and accessibility needs
- Include brief descriptions and reasons for recommendations

COORDINATE ACCURACY REQUIREMENTS:
- CRITICAL: Provide precise, real-world latitude and longitude coordinates for each place
- Use actual GPS coordinates of the specific venue, not approximate area coordinates
- Coordinates must be accurate to 4-6 decimal places (e.g., 48.858844, 2.294351)
- For restaurants/attractions: Use the exact building/entrance coordinates
- For landmarks: Use the main entrance or central point coordinates
- Double-check coordinate accuracy - wrong coordinates break map functionality
- If unsure about exact coordinates, use the most precise available for that specific venue

CRITICAL: Respond with ONLY the JSON data, no markdown formatting, no code blocks, no additional text.

Format your response as pure JSON with this exact structure:
{
  "itinerary": {
    "day_1": [
      {
        "time": "9:00 AM",
        "place": "Specific Place Name",
        "type": "category",
        "description": "Brief description",
        "duration": "2 hours",
        "cost": "$10-20",
        "address": "Complete street address with city",
        "coordinates": {
          "latitude": 48.858844,
          "longitude": 2.294351
        }
      }
    ]
  },
  "summary": "Brief overview of the itinerary highlights"
}`;
  }

  // Helper method to generate user prompt for itinerary generation
  _generateUserPrompt(queryData) {
    const { location, categories, duration, preferences } = queryData;
    
    return `Create a ${duration}-day itinerary for ${location}.

Categories requested: ${categories.join(', ')}

Preferences:
${preferences.budget ? `Budget: ${preferences.budget}` : ''}
${preferences.dietary ? `Dietary restrictions: ${preferences.dietary.join(', ')}` : ''}
${preferences.accessibility ? 'Accessibility requirements needed' : ''}

IMPORTANT REQUIREMENTS:
- Focus on authentic local experiences and practical logistics
- Include exact, precise GPS coordinates (latitude/longitude) for each venue
- Use real addresses and specific place names, not generic locations
- Ensure coordinates are accurate enough for map plotting and navigation
- Verify each place actually exists at the provided coordinates`;
  }

  // Helper method to get common OpenAI API configuration
  _getApiConfig(messages, streaming = false) {
    const config = {
      model: 'gpt-4o-2024-05-13',
      messages,
      temperature: 0.7,
      max_tokens: 4096
    };
    
    if (streaming) {
      config.stream = true;
    }
    
    return config;
  }

  // Helper method to parse AI response with fallback
  _parseAiResponse(content, fallbackSummary = 'Generated itinerary (text format)') {
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, returning as text');
      return {
        itinerary: { text: content },
        summary: fallbackSummary
      };
    }
  }

  // Generate travel itinerary
  async generateItinerary(queryData) {
    const systemPrompt = this._getItinerarySystemPrompt();
    const userPrompt = this._generateUserPrompt(queryData);

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      const response = await this.client.chat.completions.create(
        this._getApiConfig(messages)
      );

      const content = response.choices[0].message.content;
      return this._parseAiResponse(content);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      throw error;
    }
  }

  // Generate streaming itinerary (for real-time updates)
  async generateItineraryStream(queryData, onUpdate) {
    const systemPrompt = this._getItinerarySystemPrompt();
    const userPrompt = this._generateUserPrompt(queryData);

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      const stream = await this.client.chat.completions.create(
        this._getApiConfig(messages, true)
      );

      let fullResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onUpdate({
            type: 'content',
            content: content,
            fullContent: fullResponse
          });
        }
      }

      // Try to parse final response as JSON
      const parsed = this._parseAiResponse(fullResponse, 'Generated itinerary');
      onUpdate({
        type: 'complete',
        content: parsed
      });
      return parsed;
    } catch (error) {
      console.error('Error generating streaming itinerary:', error);
      onUpdate({
        type: 'error',
        error: error.message
      });
      throw error;
    }
  }

  // Create query string for embedding with better parameter separation
  createQueryString(queryData) {
    const { location, categories, duration, preferences } = queryData;
    
    // Create structured query string with clear parameter separation
    let queryString = `DESTINATION: ${location}`;
    queryString += ` DURATION: ${duration} days`;
    
    if (categories && categories.length > 0) {
      const sortedCategories = [...categories].sort(); // Ensure consistent ordering
      queryString += ` CATEGORIES: ${sortedCategories.join(', ')}`;
    }
    
    if (preferences.budget) {
      queryString += ` BUDGET: ${preferences.budget}`;
    }
    
    if (preferences.dietary && preferences.dietary.length > 0) {
      const sortedDietary = [...preferences.dietary].sort(); // Ensure consistent ordering
      queryString += ` DIETARY: ${sortedDietary.join(', ')}`;
    }
    
    if (preferences.accessibility) {
      queryString += ' ACCESSIBILITY: required';
    }
    
    // Add parameter weights to make differences more significant
    queryString += ` TRIP_TYPE: ${duration}_day_${categories.join('_')}_${preferences.budget || 'any'}`;
    
    return queryString.toLowerCase();
  }
}

module.exports = new OpenAIService();