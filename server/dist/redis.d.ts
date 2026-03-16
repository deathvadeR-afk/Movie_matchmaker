/**
 * Redis Connection Module
 * Handles connection to Redis cloud instance
 */
import Redis from 'ioredis';
declare let redisClient: Redis | null;
/**
 * Initialize Redis connection
 */
export declare function connectRedis(): Promise<Redis>;
/**
 * Get Redis client instance
 */
export declare function getRedisClient(): Redis | null;
/**
 * Check if Redis is connected
 */
export declare function isRedisConnected(): boolean;
/**
 * Get connection error if any
 */
export declare function getRedisError(): Error | null;
/**
 * Disconnect Redis
 */
export declare function disconnectRedis(): Promise<void>;
/**
 * Health check for Redis connection
 */
export declare function healthCheck(): Promise<{
    status: string;
    latency?: number;
    error?: string;
}>;
export default redisClient;
