/**
 * Redis Connection Module
 * Handles connection to Redis cloud instance
 */
import Redis from 'ioredis';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Redis configuration from environment variables
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0');
const REDIS_USE_TLS = process.env.REDIS_USE_TLS !== 'false'; // Default to TLS
console.log('[Redis] Attempting to connect to:', REDIS_HOST, ':', REDIS_PORT, REDIS_USE_TLS ? '(TLS)' : '(no TLS)');
// Create Redis client with connection string support
let redisClient = null;
// Track connection status
let isConnected = false;
let isConnecting = false;
let connectionError = null;
/**
 * Create and configure Redis client
 */
function createRedisClient() {
    const config = {
        host: REDIS_HOST,
        port: REDIS_PORT,
        db: REDIS_DB,
        retryStrategy: (times) => {
            // Retry up to 5 times with exponential backoff
            if (times > 5) {
                console.error('[Redis] Max retry attempts reached');
                return null;
            }
            return Math.min(times * 500, 5000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        connectTimeout: 30000,
        commandTimeout: 10000,
    };
    // Add password if provided (for Redis cloud)
    if (REDIS_PASSWORD) {
        config.password = REDIS_PASSWORD;
    }
    // Redis cloud may require TLS - configure based on setting
    if (REDIS_USE_TLS) {
        config.tls = {};
    }
    const client = new Redis(config);
    // Connection event handlers
    client.on('connect', () => {
        console.log('[Redis] Connecting to Redis...');
        isConnected = false;
    });
    client.on('ready', () => {
        console.log(`[Redis] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
        isConnected = true;
        connectionError = null;
    });
    client.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
        connectionError = err;
        isConnected = false;
    });
    client.on('close', () => {
        console.log('[Redis] Connection closed');
        isConnected = false;
    });
    client.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
    });
    return client;
}
/**
 * Initialize Redis connection
 */
export async function connectRedis() {
    // Already connected
    if (redisClient && isConnected) {
        return redisClient;
    }
    // Already connecting - wait for it
    if (isConnecting) {
        console.log('[Redis] Connection in progress, waiting...');
        await new Promise((resolve) => {
            const checkConnection = setInterval(() => {
                if (isConnected || !isConnecting) {
                    clearInterval(checkConnection);
                    resolve();
                }
            }, 100);
        });
        return redisClient;
    }
    isConnecting = true;
    redisClient = createRedisClient();
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                isConnecting = false;
                reject(new Error('Connection timeout'));
            }, 30000);
            redisClient.on('ready', () => {
                clearTimeout(timeout);
                isConnecting = false;
                resolve();
            });
            redisClient.on('error', (err) => {
                clearTimeout(timeout);
                isConnecting = false;
            });
        });
        return redisClient;
    }
    catch (error) {
        isConnecting = false;
        console.error('[Redis] Failed to connect:', error);
        throw error;
    }
}
/**
 * Get Redis client instance
 */
export function getRedisClient() {
    return redisClient;
}
/**
 * Check if Redis is connected
 */
export function isRedisConnected() {
    return isConnected;
}
/**
 * Get connection error if any
 */
export function getRedisError() {
    return connectionError;
}
/**
 * Disconnect Redis
 */
export async function disconnectRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        isConnected = false;
        console.log('[Redis] Disconnected');
    }
}
/**
 * Health check for Redis connection
 */
export async function healthCheck() {
    console.log('[Redis] Running health check...');
    if (!redisClient || !isConnected) {
        console.log('[Redis] Health check FAILED - Not connected');
        return { status: 'disconnected', error: connectionError?.message || 'Not connected' };
    }
    try {
        const start = Date.now();
        await redisClient.ping();
        const latency = Date.now() - start;
        console.log(`[Redis] Health check PASSED - Latency: ${latency}ms`);
        return { status: 'connected', latency };
    }
    catch (error) {
        console.error('[Redis] Health check ERROR:', error);
        return { status: 'error', error: error.message };
    }
}
export default redisClient;
