import { useState, useEffect, useCallback, useRef } from 'react';

export interface Metrics {
  avgResponseTime: number;
  cacheHitRate: number;
  totalQueries: number;
  timestamp: number;
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [eventSourceRef, setEventSourceRef] = useState<EventSource | null>(null);
  const initializationRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second


  // Clear any pending reconnection attempts
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, giving up');
      setError('Connection failed after multiple attempts');
      setIsLoading(false);
      setIsLive(false);
      return;
    }

    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
    console.log(`Scheduling reconnection attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms`);
    
    clearReconnectTimeout();
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
      startLiveMetrics();
    }, delay);
  }, [clearReconnectTimeout]);

  // Start live metrics streaming with SSE only
  const startLiveMetrics = useCallback(() => {
    // Prevent multiple connections
    if (eventSourceRef) {
      console.log('EventSource already exists, cleaning up first');
      eventSourceRef.close();
      setEventSourceRef(null);
    }

    // Clear any pending reconnection
    clearReconnectTimeout();

    console.log('Starting live metrics with SSE');
    setIsLive(true);
    setError(null);
    setIsLoading(true);

    try {
      // Use direct backend URL for EventSource as Next.js proxy doesn't work well with SSE in browser
      const metricsUrl = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/stream/metrics`
        : 'http://localhost:3001/api/stream/metrics';
      
      const eventSource = new EventSource(metricsUrl);
      console.log('Created EventSource for metrics:', metricsUrl);
      setEventSourceRef(eventSource);

      eventSource.onopen = (event) => {
        console.log('SSE connection opened successfully');
        reconnectAttemptsRef.current = 0; // Reset reconnection attempts on success
        setError(null);
        setIsLoading(false);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metrics_update') {
            console.log('Metrics update received:', data.metrics);
            setMetrics(data.metrics);
            setError(null); // Clear any previous errors
            setIsLoading(false);
          } else if (data.type === 'ping') {
            console.log('Received SSE keep-alive ping');
          } else if (data.type === 'metrics_error') {
            console.error('Server-side metrics error:', data.error);
            setError(`Server error: ${data.error}`);
          }
        } catch (err) {
          console.error('Error parsing metrics event:', err, 'Raw data:', event.data);
          setError('Failed to parse metrics data');
        }
      };

      eventSource.onerror = (err) => {
        console.error('Metrics stream error. ReadyState:', eventSource.readyState);
        
        // Clean up current connection
        eventSource.close();
        setEventSourceRef(null);
        setIsLoading(false);

        // Handle different connection states
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('EventSource connection was closed');
          setError('Connection closed unexpectedly');
          setIsLive(false);
          
          // Try to reconnect unless we're intentionally stopping
          if (isLive) {
            scheduleReconnect();
          }
        } else {
          console.log('EventSource connection failed to establish');
          setError('Failed to establish connection');
          setIsLive(false);
          scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError('Failed to create metrics connection');
      setIsLoading(false);
      setIsLive(false);
      scheduleReconnect();
    }
  }, [clearReconnectTimeout, scheduleReconnect, isLive]);

  // Stop live metrics
  const stopLiveMetrics = useCallback(() => {
    console.log('Stopping live metrics');
    
    // Clear any pending reconnection attempts
    clearReconnectTimeout();
    reconnectAttemptsRef.current = 0;
    
    // Close SSE connection
    if (eventSourceRef) {
      eventSourceRef.close();
      setEventSourceRef(null);
    }
    
    setIsLive(false);
    setError(null);
    setIsLoading(false);
  }, [eventSourceRef, clearReconnectTimeout]);

  // Auto-start live metrics during planning
  const startLiveMetricsDuringPlanning = useCallback(() => {
    startLiveMetrics();
  }, []); // Remove startLiveMetrics dependency to prevent re-creation

  // Auto-stop live metrics after planning
  const stopLiveMetricsAfterPlanning = useCallback(() => {
    stopLiveMetrics();
  }, []); // Remove stopLiveMetrics dependency to prevent re-creation

  // Auto-start SSE on mount - runs only once
  useEffect(() => {
    if (!initializationRef.current) {
      console.log('useMetrics: Starting SSE connection for the first time');
      initializationRef.current = true;
      
      // Clean up any existing connection
      if (eventSourceRef) {
        console.log('useMetrics: Closing existing EventSource before starting new one');
        eventSourceRef.close();
        setEventSourceRef(null);
      }
      
      // Reset states and start fresh
      setIsLive(false);
      setError(null);
      setIsLoading(false);
      
      // Start with a slight delay to ensure states are reset
      setTimeout(() => {
        startLiveMetrics();
      }, 100);
    }
  }, []); // Empty dependency array ensures this runs only once

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('useMetrics cleanup: Cleaning up on unmount');
      clearReconnectTimeout();
      if (eventSourceRef) {
        eventSourceRef.close();
      }
    };
  }, [eventSourceRef, clearReconnectTimeout]);

  return {
    metrics,
    isLoading,
    error,
    isLive,
    eventSource: !!eventSourceRef,
    initialized: initializationRef.current,
    startLiveMetricsDuringPlanning,
    stopLiveMetricsAfterPlanning,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}