import { WebSocket } from 'ws'; // assuming 'ws' package is used with @fastify/websocket

export class WebSocketManager {
    private clients: Set<WebSocket> = new Set();

    addClient(ws: WebSocket) {
        this.clients.add(ws);
        console.log('WebSocket client connected. Total clients:', this.clients.size);

        ws.on('close', () => {
            this.removeClient(ws);
        });
    }

    removeClient(ws: WebSocket) {
        this.clients.delete(ws);
        console.log('WebSocket client disconnected. Total clients:', this.clients.size);
    }

    broadcast(message: string) {
        console.log('Broadcasting message to all clients:', message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

// Export a singleton instance
export const webSocketManager = new WebSocketManager();
