import { useState, useCallback, useRef } from 'react';

export interface StreamingEvent {
  type: 'connected' | 'processing_started' | 'cache_hit' | 'cache_miss' | 'content_chunk' | 'complete' | 'error' | 'session_end';
  message?: string;
  similarity?: number;
  searchTime?: number;
  content?: string;
  fullContent?: string;
  response?: any;
  error?: string;
  timestamp: number;
}

export interface StreamingState {
  isLoading: boolean;
  isConnected: boolean;
  events: StreamingEvent[];
  currentContent: string;
  finalResponse: any;
  error: string | null;
  cacheHit: boolean;
  similarity?: number;
  responseTime?: number;
}

export function useStreamingQuery() {
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    isConnected: false,
    events: [],
    currentContent: '',
    finalResponse: null,
    error: null,
    cacheHit: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const startStreaming = useCallback(async (queryData: {
    location: string;
    categories: string[];
    duration: number;
    preferences?: any;
  }) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      isConnected: false,
      events: [],
      currentContent: '',
      finalResponse: null,
      error: null,
      cacheHit: false,
      similarity: undefined,
      responseTime: undefined,
    }));

    try {
      // Make POST request to initiate streaming
      const response = await fetch('/api/stream/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': Math.random().toString(36).substr(2, 9),
        },
        body: JSON.stringify(queryData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const startTime = Date.now();

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  handleStreamEvent(eventData, startTime);
                } catch (parseError) {
                  console.error('Error parsing SSE data:', parseError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          setState(prev => ({
            ...prev,
            isLoading: false,
            isConnected: false,
            error: error instanceof Error ? error.message : 'Stream processing failed',
          }));
        }
      };

      setState(prev => ({ ...prev, isConnected: true }));
      await processStream();

    } catch (error) {
      console.error('Streaming error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, []);

  const handleStreamEvent = useCallback((event: StreamingEvent, startTime: number) => {
    setState(prev => {
      const newEvents = [...prev.events, event];
      
      switch (event.type) {
        case 'connected':
          return {
            ...prev,
            isConnected: true,
            events: newEvents,
          };

        case 'cache_hit':
          return {
            ...prev,
            cacheHit: true,
            similarity: event.similarity,
            events: newEvents,
          };

        case 'cache_miss':
          return {
            ...prev,
            cacheHit: false,
            events: newEvents,
          };

        case 'content_chunk':
          return {
            ...prev,
            currentContent: event.fullContent || prev.currentContent + (event.content || ''),
            events: newEvents,
          };

        case 'complete':
          return {
            ...prev,
            isLoading: false,
            finalResponse: event.response,
            responseTime: Date.now() - startTime,
            events: newEvents,
          };

        case 'error':
          return {
            ...prev,
            isLoading: false,
            isConnected: false,
            error: event.error || 'Unknown error occurred',
            events: newEvents,
          };

        case 'session_end':
          return {
            ...prev,
            isLoading: false,
            isConnected: false,
            events: newEvents,
          };

        default:
          return {
            ...prev,
            events: newEvents,
          };
      }
    });
  }, []);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      isConnected: false,
    }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      events: [],
      currentContent: '',
      finalResponse: null,
      error: null,
      cacheHit: false,
      similarity: undefined,
      responseTime: undefined,
    }));
  }, []);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    clearResults,
  };
}