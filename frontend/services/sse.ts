import { API_BASE_URL, PUBLIC_FALLBACK_API_URL } from '../constants';

let eventSource: EventSource | null = null;

export const connectSSE = (onMessage: (event: MessageEvent) => void, token?: string) => {
  if (eventSource) {
    eventSource.close();
  }

  const apiUrl = API_BASE_URL || PUBLIC_FALLBACK_API_URL;
  // Note: EventSource doesn't easily support custom headers for auth like Bearer tokens.
  // A common workaround is to pass the token as a query parameter.
  // The backend must be configured to accept this.
  const url = token ? `${apiUrl}/api/realtime/sse?token=${token}` : `${apiUrl}/api/realtime/sse`;

  eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    console.log("SSE Message:", event.data);
    onMessage(event);
  };

  eventSource.onerror = (err) => {
    console.error("EventSource failed:", err);
    eventSource?.close();
  };

  return eventSource;
};

export const disconnectSSE = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    console.log("SSE Disconnected.");
  }
};
