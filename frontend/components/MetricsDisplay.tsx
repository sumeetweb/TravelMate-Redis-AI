import { useMetrics } from '../hooks/useMetrics';

interface MetricsDisplayProps {
  isPlanning?: boolean;
}

export default function MetricsDisplay({ isPlanning = false }: MetricsDisplayProps) {
  const { 
    metrics, 
    isLoading, 
    error, 
    isLive, 
    eventSource,
    initialized,
    reconnectAttempts,
    startLiveMetricsDuringPlanning 
  } = useMetrics();

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCacheHitRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  if (error && !metrics) {
    return (
      <div className="metric-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
            Connection Failed
          </span>
        </div>
        <div className="text-red-600 mb-3">
          <svg className="h-5 w-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          {reconnectAttempts > 0 && (
            <span className="text-sm text-gray-500 ml-2">
              (Attempt {reconnectAttempts}/5)
            </span>
          )}
        </div>
        <button 
          onClick={startLiveMetricsDuringPlanning}
          className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? '🔄 Reconnecting...' : '🔄 Retry Connection'}
        </button>
      </div>
    );
  }

  if (isLoading && !metrics) {
    return (
      <div className="metric-card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <p className="text-sm text-gray-500 mt-2">Loading metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
          {isPlanning && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
              Planning Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isLive && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
              Live Stream
            </span>
          )}
          {!isLive && !isLoading && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
              {error ? `Failed ${reconnectAttempts > 0 ? `(${reconnectAttempts}/5)` : ''}` : 'Disconnected'}
            </span>
          )}
          {isLoading && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
              Connecting...
            </span>
          )}
        </div>
      </div>

      {!metrics && !isLoading && !error && (
        <div className="metric-card">
          <p className="text-gray-500 mb-3">No metrics data available yet. Metrics will appear after processing travel queries.</p>
          <button 
            onClick={startLiveMetricsDuringPlanning}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 transition-colors"
          >
            🔄 Retry Connection
          </button>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Average Response Time */}
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(metrics.avgResponseTime)}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-xs ${
                metrics.avgResponseTime < 1000 ? 'text-green-600' : 
                metrics.avgResponseTime < 3000 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.avgResponseTime < 1000 ? '🚀 Excellent' : 
                 metrics.avgResponseTime < 3000 ? '⚡ Good' : '🔄 Slow'}
              </span>
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCacheHitRate(metrics.cacheHitRate)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(metrics.cacheHitRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Total Queries */}
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Queries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalQueries.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">
                Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Redis Features Showcase */}
      <div className="metric-card">
        <h3 className="font-semibold text-gray-900 mb-3">Redis Stack Features in Action</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-red-600 font-mono text-xs mb-1">VECTOR</div>
            <div className="text-xs text-gray-600">Semantic Cache</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-600 font-mono text-xs mb-1">JSON</div>
            <div className="text-xs text-gray-600">Itinerary Storage</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-green-600 font-mono text-xs mb-1">STREAMS</div>
            <div className="text-xs text-gray-600">Event Logging</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-purple-600 font-mono text-xs mb-1">TS</div>
            <div className="text-xs text-gray-600">Time Series</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-yellow-600 font-mono text-xs mb-1">PUB/SUB</div>
            <div className="text-xs text-gray-600">Real-time</div>
          </div>
        </div>
      </div>
    </div>
  );
}