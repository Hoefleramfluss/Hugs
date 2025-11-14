// This file can contain more complex logic for handling
// different types of real-time events from the backend.

import { connectSSE, disconnectSSE } from './sse';

export interface RealtimeEvent {
    type: string;
    data: any;
}

export const subscribeToRealtimeEvents = (
    onEvent: (event: RealtimeEvent) => void,
    token?: string
) => {
    const handleMessage = (event: MessageEvent) => {
        try {
            const parsedData: RealtimeEvent = JSON.parse(event.data);
            onEvent(parsedData);
        } catch (error) {
            console.error('Failed to parse SSE event data:', event.data, error);
        }
    };

    connectSSE(handleMessage, token);

    // Return a function to unsubscribe
    return () => {
        disconnectSSE();
    };
};

export default {
    subscribeToRealtimeEvents,
};
