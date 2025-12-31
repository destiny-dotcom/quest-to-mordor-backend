import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import stepsRoutes from './routes/steps';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Quest to Mordor API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/steps', stepsRoutes);

app.listen(Number(port), '0.0.0.0', () => {
  logger.info(`Quest to Mordor API running on port ${port}`);
});
