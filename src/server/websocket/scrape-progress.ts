import { Elysia, t } from 'elysia';

export interface ScrapeProgress {
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

export const scrapeState: ScrapeProgress & { subscribers: Set<unknown> } = {
  isRunning: false,
  currentLocation: null,
  progress: {
    pagesScraped: 0,
    propertiesFound: 0,
    newProperties: 0,
    currentPage: 0,
    totalPages: 0
  },
  subscribers: new Set()
};

export function broadcastProgress(data: { type: string; data?: unknown }) {
  const message = JSON.stringify(data);
  for (const ws of scrapeState.subscribers) {
    try {
      (ws as { send: (msg: string) => void }).send(message);
    } catch {
      scrapeState.subscribers.delete(ws);
    }
  }
}

export function updateScrapeState(updates: Partial<ScrapeProgress>) {
  if (updates.isRunning !== undefined) scrapeState.isRunning = updates.isRunning;
  if (updates.currentLocation !== undefined) scrapeState.currentLocation = updates.currentLocation;
  if (updates.progress) {
    scrapeState.progress = { ...scrapeState.progress, ...updates.progress };
  }
  
  broadcastProgress({
    type: 'progress',
    data: {
      isRunning: scrapeState.isRunning,
      currentLocation: scrapeState.currentLocation,
      progress: scrapeState.progress
    }
  });
}

export function resetScrapeState() {
  scrapeState.isRunning = false;
  scrapeState.currentLocation = null;
  scrapeState.progress = {
    pagesScraped: 0,
    propertiesFound: 0,
    newProperties: 0,
    currentPage: 0,
    totalPages: 0
  };
}

export const scrapeWebSocket = new Elysia()
  .ws('/ws/scrape', {
    open(ws) {
      scrapeState.subscribers.add(ws);
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          isRunning: scrapeState.isRunning,
          currentLocation: scrapeState.currentLocation,
          progress: scrapeState.progress
        }
      }));
    },
    close(ws) {
      scrapeState.subscribers.delete(ws);
    },
    message(ws, message) {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      if (data?.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    }
  });
