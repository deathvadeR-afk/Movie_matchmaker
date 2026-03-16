/**
 * Cache API Server
 * Provides REST endpoints for Redis caching operations
 */
import express from 'express';
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
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// ============ Cache API Endpoints ============
/**
 * GET /api/cache/:key
 * Get cached data by key
 */
app.get('/api/cache/:key', async (req, res) => {
    try {
        const redis = getRedisClient();
        if (!redis || !isRedisConnected()) {
            console.log('[Redis] GET - Redis not available, using fallback');
            return res.status(503).json({
                error: 'Redis not available',
                fallback: 'memory'
            });
        }
        const { key } = req.params;
        console.log(`[Redis] GET cache key: movie_cache:${key}`);
        const data = await redis.get(`movie_cache:${key}`);
        if (!data) {
            console.log(`[Redis] CACHE MISS: movie_cache:${key}`);
            return res.status(404).json({ found: false });
        }
        console.log(`[Redis] CACHE HIT: movie_cache:${key}`);
        const parsed = JSON.parse(data);
        return res.json({ found: true, data: parsed });
    }
    catch (error) {
        console.error('[GET /api/cache/:key] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/cache
 * Set cache data
 * Body: { key: string, data: any, ttl?: number }
 */
app.post('/api/cache', async (req, res) => {
    try {
        const redis = getRedisClient();
        if (!redis || !isRedisConnected()) {
            console.log('[Redis] POST - Redis not available, using fallback');
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
            console.log(`[Redis] SET cache key: ${cacheKey} (TTL: ${ttl}ms)`);
            await redis.setex(cacheKey, Math.floor(ttl / 1000), serialized);
        }
        else {
            console.log(`[Redis] SET cache key: ${cacheKey} (no TTL)`);
            await redis.set(cacheKey, serialized);
        }
        console.log(`[Redis] CACHE SET SUCCESS: ${cacheKey}`);
        return res.json({ success: true, key: cacheKey });
    }
    catch (error) {
        console.error('[POST /api/cache] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * DELETE /api/cache/:key
 * Delete cached data by key
 */
app.delete('/api/cache/:key', async (req, res) => {
    try {
        const redis = getRedisClient();
        if (!redis || !isRedisConnected()) {
            console.log('[Redis] DELETE - Redis not available, using fallback');
            return res.status(503).json({
                error: 'Redis not available',
                fallback: 'memory'
            });
        }
        const { key } = req.params;
        console.log(`[Redis] DELETE cache key: movie_cache:${key}`);
        const result = await redis.del(`movie_cache:${key}`);
        console.log(`[Redis] DELETE RESULT: movie_cache:${key} -> ${result > 0 ? 'deleted' : 'not found'}`);
        return res.json({ success: true, deleted: result > 0 });
    }
    catch (error) {
        console.error('[DELETE /api/cache/:key] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * DELETE /api/cache
 * Clear all cached data
 */
app.delete('/api/cache', async (req, res) => {
    try {
        const redis = getRedisClient();
        if (!redis || !isRedisConnected()) {
            console.log('[Redis] CLEAR ALL - Redis not available, using fallback');
            return res.status(503).json({
                error: 'Redis not available',
                fallback: 'memory'
            });
        }
        // Get all keys with movie_cache: prefix
        const keys = await redis.keys('movie_cache:*');
        console.log(`[Redis] CLEAR ALL - Found ${keys.length} keys to delete`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        console.log(`[Redis] CLEAR ALL SUCCESS - Deleted ${keys.length} keys`);
        return res.json({ success: true, cleared: keys.length });
    }
    catch (error) {
        console.error('[DELETE /api/cache] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/cache/stats
 * Get cache statistics
 */
app.get('/api/cache/stats', async (req, res) => {
    try {
        const redis = getRedisClient();
        if (!redis || !isRedisConnected()) {
            console.log('[Redis] STATS - Redis not available');
            return res.status(503).json({
                error: 'Redis not available',
                status: 'disconnected'
            });
        }
        console.log('[Redis] STATS - Fetching cache statistics');
        const info = await redis.info('memory');
        const keys = await redis.keys('movie_cache:*');
        // Parse memory usage
        const memoryMatch = info.match(/used_memory_human:(\S+)/);
        const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';
        console.log(`[Redis] STATS - Total keys: ${keys.length}, Memory: ${memoryUsed}`);
        return res.json({
            status: 'connected',
            totalKeys: keys.length,
            memoryUsed,
        });
    }
    catch (error) {
        console.error('[GET /api/cache/stats] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
// ============ Health Check ============
/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (_req, res) => {
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
    }
    catch (error) {
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
