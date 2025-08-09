import { StreamingEvent, StreamingState } from '../hooks/useStreamingQuery';

interface StreamingDisplayProps {
  state: StreamingState;
}

export default function StreamingDisplay({ state }: StreamingDisplayProps) {
  const { isLoading, isConnected, events, currentContent, finalResponse, error, cacheHit, similarity, responseTime } = state;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatItinerary = (itinerary: any) => {
    if (!itinerary) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">No Itinerary Data</h3>
          <p className="text-yellow-800">The response was empty. Please try again.</p>
        </div>
      );
    }

    // Handle the standard API response format: { itinerary: { day_1: [...], day_2: [...] }, summary: "..." }
    if (itinerary.itinerary && typeof itinerary.itinerary === 'object' && !Array.isArray(itinerary.itinerary)) {
      return (
        <div className="space-y-6">
          {itinerary.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Trip Summary</h3>
              <p className="text-blue-800">{itinerary.summary}</p>
            </div>
          )}
          
          {Object.entries(itinerary.itinerary).map(([day, activities]: [string, any]) => (
            <div key={day} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 capitalize text-gray-900">
                {day.replace('_', ' ')}
              </h3>
              
              {Array.isArray(activities) ? (
                <div className="space-y-3">
                  {activities.map((activity: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-16 text-sm font-medium text-gray-600">
                        {activity.time || `${9 + index}:00`}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {activity.place || activity.name || 'Activity'}
                        </h4>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          {activity.duration && <span>⏱️ {activity.duration}</span>}
                          {activity.cost && <span>💰 {activity.cost}</span>}
                          {activity.type && <span>📍 {activity.type}</span>}
                        </div>
                        {activity.address && (
                          <p className="text-xs text-gray-500 mt-1">📍 {activity.address}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-700">{String(activities)}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Handle text fallback format: { itinerary: { text: "..." }, summary: "..." }
    if (itinerary.itinerary?.text || itinerary.text) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-4 text-gray-900">Travel Itinerary</h3>
          <div className="whitespace-pre-wrap text-gray-700">
            {itinerary.itinerary?.text || itinerary.text}
          </div>
        </div>
      );
    }

    // Fallback for unexpected formats
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-4 text-gray-900">Travel Itinerary</h3>
        <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
          <p className="text-orange-800 text-sm">⚠️ Unexpected response format. Showing raw data:</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-gray-700 text-sm bg-gray-50 p-4 rounded border font-mono leading-relaxed">
            {JSON.stringify(itinerary, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800 font-medium">Error</span>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      {(isLoading || isConnected) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isLoading && (
                <div className="typing-indicator mr-3">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              <span className="text-blue-800 font-medium">
                {isConnected ? 'Processing your request...' : 'Connecting...'}
              </span>
            </div>
            
            {cacheHit !== undefined && (
              <div className="flex items-center space-x-2">
                <span className={cacheHit ? 'cache-hit-badge' : 'cache-miss-badge'}>
                  {cacheHit ? '⚡ Cache Hit' : '🔄 Generating'}
                </span>
                {similarity && (
                  <span className="similarity-score">
                    {(similarity * 100).toFixed(1)}% similar
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event stream - Scrollable processing steps */}
      {events.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Processing Steps</h3>
          <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-2 pr-2">
              {events.map((event, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <span className="text-gray-700 flex-1">
                    {event.message || event.type}
                  </span>
                  {event.searchTime && (
                    <span className="text-gray-500 flex-shrink-0">
                      ({formatTime(event.searchTime)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Streaming content */}
      {currentContent && !finalResponse && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Generating Itinerary...</h3>
          <div className="whitespace-pre-wrap text-gray-700 text-sm">
            {currentContent}
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
          </div>
        </div>
      )}

      {/* Final response */}
      {finalResponse && (
        <div className="space-y-4">
          {/* Performance metrics */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-800 font-medium">Itinerary Complete!</span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-green-700">
                {responseTime && (
                  <span>⏱️ {formatTime(responseTime)}</span>
                )}
                {finalResponse.cache_hit !== undefined && (
                  <span className={finalResponse.cache_hit ? 'cache-hit-badge' : 'cache-miss-badge'}>
                    {finalResponse.cache_hit ? '⚡ Cached' : '🆕 Fresh'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Itinerary content */}
          {formatItinerary(finalResponse.itinerary)}
        </div>
      )}
    </div>
  );
}