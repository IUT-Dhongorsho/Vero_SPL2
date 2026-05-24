import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { subscriberService } from './services/subscriber.service.js';

const app = express();

// Initialize Subscriber
subscriberService.init().catch(console.error);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'board-service' });
});

app.listen(env.PORT, () => {
    console.log(`🚀 Board service running on port ${env.PORT}`);
});
