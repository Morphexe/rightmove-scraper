import { useEffect, useState, useCallback, useRef } from 'react';

interface ScrapeProgress {
  isRunning: boolean;
  currentLocation: string | null;
  progress: {
    pagesScraped: number;
    propertiesFound: number;
    newProperties: number;
    currentPage: number;
    totalPages: number;
  };
}

interface WebSocketMessage {
  type: 'status' | 'progress' | 'complete' | 'error' | 'pong';
  data?: ScrapeProgress | { message: string };
}

export function useScrapeWebSocket() {
  const [status, setStatus] = useState<ScrapeProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/scrape`);
    
    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };
    
    ws.onclose = () => {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
    
    ws.onerror = () => {
      setError('WebSocket connection failed');
    };
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        if (message.type === 'status' || message.type === 'progress') {
          setStatus(message.data as ScrapeProgress);
        } else if (message.type === 'complete') {
          setStatus(prev => prev ? { ...prev, isRunning: false } : null);
        } else if (message.type === 'error') {
          setError((message.data as { message: string })?.message || 'Unknown error');
        }
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };
    
    wsRef.current = ws;
  }, []);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);
  
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);
  
  return { status, connected, error, sendPing };
}
