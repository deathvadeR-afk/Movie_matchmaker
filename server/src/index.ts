/**
 * Cache API Server
 * Provides REST endpoints for Redis caching operations
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectRedis, getRedisClient, healthCheck, isRedisConnected, disconnectRedis } from './redis.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============ Cache API Endpoints ============

/**
 * GET /api/cache/:key
 * Get cached data by key
 */
app.get('/api/cache/:key', async (req: Request, res: Response) => {
    try {
        const redis = getRedisClient();

        if (!redis || !isRedisConnected()) {
            return res.status(503).json({
                error: 'Redis not available',
                fallback: 'memory'
            });
        }

        const { key } = req.params;
        const data = await redis.get(`movie_cache:${key}`);

        if (!data) {
            return res.status(404).json({ found: false });
        }

        const parsed = JSON.parse(data);
        return res.json({ found: true, data: parsed });
    } catch (error) {
        console.error('[GET /api/cache/:key] Error:', error);
        return res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * POST /api/cache
 * Set cache data
 * Body: { key: string, data: any, ttl?: number }
 */
app.post('/api/cache', async (req: Request, res: Response) => {
    try {
        const redis = getRedisClient();

        if (!redis || !isRedisConnected()) {
            return res.status(503).json({
                error: 'Redis not available',
                fallback: 'memory'
            });
        }

        const { key, data, ttl } = req.body;

        if (!key || data === undefined) {
            return res.status(400).json({ error: 'Missing key or data' });
        }

        const cacheKey = `movie_cache:${key}`;
        const serialized = JSON.stringify(data);

        if (ttl) {
            await redis.setex(cacheKey, Math.floor(ttl / 1000), serialized);
        } else {
            await redis.set(cacheKey, serialized);
        }

        return res.json({ success: true, key: cacheKey });
    } catch (error) {
        console.error('[POST /api/cache] Error:', error);
        return res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * DELETE /api/cache/:key
 * Delete cached data by key
 */
app.delete('/api/cache/:key', async (req: Request, res: Response) => {
    try {
        const redis = getRedisClient();

        if (!redis || !isRedisConnected()) {
            return res.status(503).json({
                error: 'Redis not available',
                fallback: 'memory'
            });
        }

        const { key } = req.params;
        const result = await redis.del(`movie_cache:${key}`);

        return res.json({ success: true, deleted: result > 0 });
    } catch (error) {
        console.error('[DELETE /api/cache/:key] Error:', error);
        return res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * DELETE /api/cache
 * Clear all cached data
 */
app.delete('/api/cache', async (req: Request, res: Response) => {
    try {
        const redis = getRedisClient();

        if (!redis || !isRedisConnected()) {
            return res.status(503).json({
                error: 'Redis not available',
                fallback: 'memory'
            });
        }

        // Get all keys with movie_cache: prefix
        const keys = await redis.keys('movie_cache:*');

        if (keys.length > 0) {
            await redis.del(...keys);
        }

        return res.json({ success: true, cleared: keys.length });
    } catch (error) {
        console.error('[DELETE /api/cache] Error:', error);
        return res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
app.get('/api/cache/stats', async (req: Request, res: Response) => {
    try {
        const redis = getRedisClient();

        if (!redis || !isRedisConnected()) {
            return res.status(503).json({
                error: 'Redis not available',
                status: 'disconnected'
            });
        }

        const info = await redis.info('memory');
        const keys = await redis.keys('movie_cache:*');

        // Parse memory usage
        const memoryMatch = info.match(/used_memory_human:(\S+)/);
        const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

        return res.json({
            status: 'connected',
            totalKeys: keys.length,
            memoryUsed,
        });
    } catch (error) {
        console.error('[GET /api/cache/stats] Error:', error);
        return res.status(500).json({ error: (error as Error).message });
    }
});

// ============ Health Check ============

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (_req: Request, res: Response) => {
    const redisHealth = await healthCheck();

    res.json({
        server: 'ok',
        redis: redisHealth,
        timestamp: new Date().toISOString(),
    });
});

// ============ Server Startup ============

async function startServer() {
    try {
        // Connect to Redis
        console.log('Connecting to Redis...');
        await connectRedis();

        // Start server
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🎬 Movie Recommendation Cache Server                      ║
║  ─────────────────────────────────────────────────────────  ║
║  Server running on: http://localhost:${PORT}              ║
║  Redis status: ${isRedisConnected() ? '✓ Connected' : '✗ Disconnected'}                    ║
║  ─────────────────────────────────────────────────────────  ║
║  Endpoints:                                                ║
║  GET  /api/health         - Health check                   ║
║  GET  /api/cache/:key     - Get cached data                ║
║  POST /api/cache          - Set cache data                 ║
║  DELETE /api/cache/:key   - Delete cache entry             ║
║  DELETE /api/cache        - Clear all cache               ║
║  GET  /api/cache/stats    - Cache statistics               ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await disconnectRedis();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down...');
    await disconnectRedis();
    process.exit(0);
});

startServer();
