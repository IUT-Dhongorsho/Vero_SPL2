import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { subscriberService } from './services/subscriber.service.js';
import { attachYjsServer } from './ws/yjs-server.js';

const server = http.createServer(app);

// Initialize Subscriber
subscriberService.init().catch(console.error);

// Live collaboration (Yjs over WebSocket)
attachYjsServer(server);

server.listen(env.PORT, () => {
    console.log(`🚀 Notes service running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
