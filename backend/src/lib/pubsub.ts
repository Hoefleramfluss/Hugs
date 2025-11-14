
type Handler = (message: string) => void;

export class PubSub {
    private channels: Record<string, Handler[]> = {};

    subscribe(channel: string, handler: Handler) {
        if (!this.channels[channel]) {
            this.channels[channel] = [];
        }
        this.channels[channel].push(handler);
        console.log(`Handler subscribed to channel: ${channel}`);
    }

    unsubscribe(channel: string, handler: Handler) {
        if (!this.channels[channel]) {
            return;
        }
        this.channels[channel] = this.channels[channel].filter(h => h !== handler);
        console.log(`Handler unsubscribed from channel: ${channel}`);
    }

    publish(channel: string, message: string) {
        if (!this.channels[channel]) {
            return;
        }
        console.log(`Publishing to channel ${channel}:`, message);
        this.channels[channel].forEach(handler => {
            handler(message);
        });
    }
}
