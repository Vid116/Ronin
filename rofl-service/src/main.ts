import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { computeBattle } from './combat-service';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment(): void {
  const required = ['ROFL_SIGNING_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please set the following in your .env file or Docker environment:');
    missing.forEach(key => console.error(`  - ${key}`));
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
  console.log(`   ROFL_SIGNING_KEY: ${process.env.ROFL_SIGNING_KEY?.substring(0, 10)}...`);
}

validateEnvironment();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ronin-rumble-rofl-battle',
    version: '1.0.0',
    tee: 'active'
  });
});

// Battle computation endpoint
app.post('/compute-battle', async (req: Request, res: Response) => {
  try {
    console.log('Battle computation requested:', {
      matchId: req.body.matchId,
      round: req.body.round,
      timestamp: new Date().toISOString()
    });

    const result = await computeBattle(req.body);

    console.log('Battle computation completed:', {
      matchId: req.body.matchId,
      winner: result.winner,
      damageToLoser: result.damageToLoser
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Battle computation failed:', error);
    res.status(500).json({
      error: 'Battle computation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`ROFL Battle Service Started`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`TEE: Active (TDX)`);
  console.log(`=================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
