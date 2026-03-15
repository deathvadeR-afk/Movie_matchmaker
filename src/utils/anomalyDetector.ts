/**
 * Anomaly Detection Module
 * 
 * Monitors API responses for unusual patterns and potential errors.
 * Provides fallback mechanisms to ensure the app remains stable.
 */

import {
    AnomalyType,
    AnomalySeverity,
    AnomalyResult,
    AnomalyContext,
    APIMetric,
    AnomalyThresholds,
    DEFAULT_ANOMALY_THRESHOLDS,
} from '../types';

// ============================================
// Internal State
// ============================================

// Store metrics per endpoint
const apiMetrics: Map<string, APIMetric> = new Map();

// Store recent anomalies for alerting
const recentAnomalies: Map<string, AnomalyResult[]> = new Map();

// Configurable thresholds
let thresholds: AnomalyThresholds = { ...DEFAULT_ANOMALY_THRESHOLDS };

// ============================================
// Helper Functions
// ============================================

/**
 * Get or create metric entry for an endpoint
 */
function getOrCreateMetric(endpoint: string): APIMetric {
    let metric = apiMetrics.get(endpoint);
    if (!metric) {
        metric = {
            endpoint,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            lastRequestTime: 0,
            errorRate: 0,
            rateLimitHits: 0,
            recentResponseTimes: [],
        };
        apiMetrics.set(endpoint, metric);
    }
    return metric;
}

/**
 * Calculate rolling average from recent response times
 */
function calculateRollingAverage(times: number[]): number {
    if (times.length === 0) return 0;
    const sum = times.reduce((acc, t) => acc + t, 0);
    return sum / times.length;
}

/**
 * Log anomaly for alerting system
 */
function logAnomaly(endpoint: string, result: AnomalyResult): void {
    const anomalies = recentAnomalies.get(endpoint) || [];
    anomalies.push(result);

    // Keep only last 20 anomalies per endpoint
    if (anomalies.length > 20) {
        anomalies.shift();
    }
    recentAnomalies.set(endpoint, anomalies);
}

/**
 * Check if repeated anomalies warrant alerting
 */
function shouldAlert(endpoint: string): boolean {
    const anomalies = recentAnomalies.get(endpoint) || [];
    const recentCount = anomalies.filter(
        a => Date.now() - a.timestamp < 5 * 60 * 1000 // Last 5 minutes
    ).length;
    return recentCount >= 3;
}

/**
 * Get base anomaly result
 */
function createBaseResult(): AnomalyResult {
    return {
        detected: false,
        severity: 'low',
        message: 'No anomalies detected',
        timestamp: Date.now(),
        shouldFallback: false,
        shouldRetry: false,
    };
}

// ============================================
// Response Validation Functions
// ============================================

/**
 * Validates TMDB API responses
 */
export function validateTMDBResponse(response: unknown, endpoint: string): AnomalyResult {
    try {
        const result = createBaseResult();

        // Check for null/undefined
        if (response === null || response === undefined) {
            result.detected = true;
            result.type = AnomalyType.EMPTY_RESPONSE;
            result.severity = 'high';
            result.message = 'TMDB response is null or undefined';
            result.shouldFallback = true;
            return result;
        }

        // Check for error response structure
        if (typeof response === 'object' && 'status_code' in (response as Record<string, unknown>)) {
            const statusCode = (response as Record<string, unknown>).status_code;
            if (statusCode !== 1 && statusCode !== 200) {
                result.detected = true;
                result.type = AnomalyType.INVALID_DATA;
                result.severity = 'high';
                result.message = `TMDB API error: ${(response as Record<string, unknown>).status_message || 'Unknown error'}`;
                result.details = { statusCode };
                result.shouldFallback = true;
                result.shouldRetry = statusCode === 429 || statusCode === 500;
                return result;
            }
        }

        // Validate expected data based on endpoint
        const endpointLower = endpoint.toLowerCase();

        if (endpointLower.includes('/search')) {
            // Search should have results array
            if (!Array.isArray((response as Record<string, unknown>).results)) {
                result.detected = true;
                result.type = AnomalyType.MISSING_FIELDS;
                result.severity = 'medium';
                result.message = 'Search response missing results array';
                result.shouldFallback = true;
                return result;
            }
        } else if (endpointLower.includes('/movie') || endpointLower.includes('/tv')) {
            // Details should have id
            if (!('id' in (response as Record<string, unknown>))) {
                result.detected = true;
                result.type = AnomalyType.MISSING_FIELDS;
                result.severity = 'medium';
                result.message = 'Media details response missing id field';
                result.shouldFallback = true;
                return result;
            }
        } else if (endpointLower.includes('/trending')) {
            // Trending should have results
            if (!Array.isArray((response as Record<string, unknown>).results)) {
                result.detected = true;
                result.type = AnomalyType.MISSING_FIELDS;
                result.severity = 'medium';
                result.message = 'Trending response missing results array';
                result.shouldFallback = true;
                return result;
            }
        }

        return result;
    } catch (error) {
        // Fallback: if validation fails, don't break the app
        return {
            detected: false,
            severity: 'low',
            message: 'Validation check failed - proceeding with response',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

/**
 * Validates Gemini API responses
 */
export function validateGeminiResponse(response: unknown): AnomalyResult {
    try {
        const result = createBaseResult();

        // Check for null/undefined
        if (response === null || response === undefined) {
            result.detected = true;
            result.type = AnomalyType.EMPTY_RESPONSE;
            result.severity = 'high';
            result.message = 'Gemini response is null or undefined';
            result.shouldFallback = true;
            return result;
        }

        // Check for error response
        if (typeof response === 'object' && 'error' in (response as Record<string, unknown>)) {
            const error = (response as Record<string, unknown>).error;
            result.detected = true;
            result.type = AnomalyType.INVALID_DATA;
            result.severity = 'high';
            result.message = `Gemini API error: ${JSON.stringify(error)}`;
            result.details = { error };
            result.shouldFallback = true;
            result.shouldRetry = true;
            return result;
        }

        // Check for valid candidates structure
        if (typeof response === 'object' && 'candidates' in (response as Record<string, unknown>)) {
            const candidates = (response as Record<string, unknown>).candidates;
            if (!Array.isArray(candidates) || candidates.length === 0) {
                result.detected = true;
                result.type = AnomalyType.EMPTY_RESPONSE;
                result.severity = 'medium';
                result.message = 'Gemini response has no candidates';
                result.shouldFallback = true;
                return result;
            }

            // Check first candidate for content
            const firstCandidate = candidates[0] as Record<string, unknown>;
            if (!('content' in firstCandidate)) {
                result.detected = true;
                result.type = AnomalyType.MISSING_FIELDS;
                result.severity = 'medium';
                result.message = 'Gemini candidate missing content';
                result.shouldFallback = true;
                return result;
            }
        }

        return result;
    } catch (error) {
        // Fallback: if validation fails, don't break the app
        return {
            detected: false,
            severity: 'low',
            message: 'Validation check failed - proceeding with response',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

/**
 * Checks for required fields in response data
 */
export function checkResponseStructure(data: unknown, expectedFields: string[]): AnomalyResult {
    try {
        const result = createBaseResult();

        if (data === null || data === undefined) {
            result.detected = true;
            result.type = AnomalyType.EMPTY_RESPONSE;
            result.severity = 'high';
            result.message = 'Data is null or undefined';
            result.shouldFallback = true;
            return result;
        }

        if (typeof data !== 'object') {
            result.detected = true;
            result.type = AnomalyType.INVALID_DATA;
            result.severity = 'medium';
            result.message = 'Data is not an object';
            result.shouldFallback = true;
            return result;
        }

        const dataObj = data as Record<string, unknown>;
        const missingFields: string[] = [];

        for (const field of expectedFields) {
            if (!(field in dataObj)) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            result.detected = true;
            result.type = AnomalyType.MISSING_FIELDS;
            result.severity = missingFields.length > expectedFields.length / 2 ? 'high' : 'medium';
            result.message = `Missing required fields: ${missingFields.join(', ')}`;
            result.details = { missingFields };
            result.shouldFallback = result.severity === 'high';
        }

        return result;
    } catch (error) {
        // Fallback: if check fails, don't break the app
        return {
            detected: false,
            severity: 'low',
            message: 'Structure check failed - proceeding with data',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

// ============================================
// Anomaly Detection Functions
// ============================================

/**
 * Main anomaly detection function
 */
export function detectAnomaly(response: unknown, context: AnomalyContext): AnomalyResult {
    try {
        const results: AnomalyResult[] = [];

        // Check for empty response
        if (response === null || response === undefined || response === '') {
            const emptyResult: AnomalyResult = {
                detected: true,
                type: AnomalyType.EMPTY_RESPONSE,
                severity: 'high',
                message: 'Empty or null response received',
                timestamp: Date.now(),
                shouldFallback: true,
                shouldRetry: true,
            };
            logAnomaly(context.endpoint, emptyResult);
            return emptyResult;
        }

        // Validate response based on data type
        if (context.dataType === 'gemini') {
            results.push(validateGeminiResponse(response));
        } else if (context.dataType) {
            // For TMDB endpoints, use validateTMDBResponse
            results.push(validateTMDBResponse(response, context.endpoint));
        }

        // Check for required fields
        if (context.expectedFields && context.expectedFields.length > 0) {
            results.push(checkResponseStructure(response, context.expectedFields));
        }

        // Check for data anomalies
        results.push(detectDataAnomalies(response));

        // Combine results - return worst case
        const detectedResults = results.filter(r => r.detected);
        if (detectedResults.length > 0) {
            // Sort by severity
            const severityOrder: AnomalySeverity[] = ['critical', 'high', 'medium', 'low'];
            detectedResults.sort((a, b) =>
                severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity)
            );

            const worst = detectedResults[0];
            logAnomaly(context.endpoint, worst);

            // Add alert flag if repeated anomalies
            if (shouldAlert(context.endpoint)) {
                worst.details = {
                    ...worst.details,
                    alertTriggered: true,
                    alertMessage: 'Repeated anomalies detected - consider switching to fallback',
                };
            }

            return worst;
        }

        return createBaseResult();
    } catch (error) {
        // Fallback: if detection fails, don't break the app
        return {
            detected: false,
            severity: 'low',
            message: 'Anomaly detection encountered error - continuing with response',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

/**
 * Analyzes response time for slowness
 */
export function analyzeResponseTime(endpoint: string, duration: number): AnomalyResult {
    try {
        const result = createBaseResult();

        if (duration > thresholds.criticalResponseMs) {
            result.detected = true;
            result.type = AnomalyType.SLOW_RESPONSE;
            result.severity = 'critical';
            result.message = `Critical: Response time (${duration}ms) exceeds ${thresholds.criticalResponseMs}ms`;
            result.details = { duration, threshold: thresholds.criticalResponseMs };
            result.shouldFallback = true;
            result.shouldRetry = false;
        } else if (duration > thresholds.slowResponseMs) {
            result.detected = true;
            result.type = AnomalyType.SLOW_RESPONSE;
            result.severity = 'medium';
            result.message = `Slow response: ${duration}ms (threshold: ${thresholds.slowResponseMs}ms)`;
            result.details = { duration, threshold: thresholds.slowResponseMs };
            result.shouldFallback = false;
            result.shouldRetry = false;
        }

        return result;
    } catch (error) {
        return {
            detected: false,
            severity: 'low',
            message: 'Response time analysis failed',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

/**
 * Detects rate limiting from response headers
 */
export function detectRateLimiting(headers: unknown): AnomalyResult {
    try {
        const result = createBaseResult();

        if (!headers || typeof headers !== 'object') {
            return result;
        }

        const headersObj = headers as Record<string, string>;

        // Check for 429 status
        if ('x-rate-limit-remaining' in headersObj) {
            const remaining = parseInt(headersObj['x-rate-limit-remaining'], 10);
            if (remaining === 0) {
                result.detected = true;
                result.type = AnomalyType.RATE_LIMIT;
                result.severity = 'high';
                result.message = 'Rate limit reached - no requests remaining';

                // Try to get retry-after header
                if (headersObj['retry-after']) {
                    result.retryAfter = parseInt(headersObj['retry-after'], 10) * 1000;
                } else {
                    result.retryAfter = 60000; // Default 1 minute
                }

                result.shouldFallback = true;
                result.shouldRetry = true;
            } else if (remaining < 5) {
                result.detected = true;
                result.type = AnomalyType.RATE_LIMIT;
                result.severity = 'medium';
                result.message = `Rate limit low: ${remaining} requests remaining`;
                result.shouldFallback = false;
                result.shouldRetry = false;
            }
        }

        // Check for specific rate limit headers
        if ('x-ratelimit-remaining' in headersObj) {
            const remaining = parseInt(headersObj['x-ratelimit-remaining'], 10);
            if (remaining === 0) {
                result.detected = true;
                result.type = AnomalyType.RATE_LIMIT;
                result.severity = 'high';
                result.message = 'Rate limit reached (alternative header)';
                result.shouldFallback = true;
                result.shouldRetry = true;
            }
        }

        return result;
    } catch (error) {
        return {
            detected: false,
            severity: 'low',
            message: 'Rate limit detection failed',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

/**
 * Detects unusual patterns in data
 */
export function detectDataAnomalies(data: unknown): AnomalyResult {
    try {
        const result = createBaseResult();

        if (data === null || data === undefined) {
            return result;
        }

        // Check for array with unexpected items
        if (Array.isArray(data)) {
            if (data.length === 0) {
                result.detected = true;
                result.type = AnomalyType.EMPTY_RESPONSE;
                result.severity = 'medium';
                result.message = 'Array response is empty';
                result.details = { itemCount: 0 };
                result.shouldFallback = true;
                return result;
            }

            // Check for inconsistent data types in array
            const types = new Set(data.map(item => typeof item));
            if (types.size > 1) {
                result.detected = true;
                result.type = AnomalyType.MALFORMED_DATA;
                result.severity = 'low';
                result.message = 'Array contains mixed data types';
                result.details = { types: Array.from(types) };
                return result;
            }
        }

        // Check for object with unusual values
        if (typeof data === 'object' && !Array.isArray(data)) {
            const obj = data as Record<string, unknown>;

            // Check for null values in expected non-null fields
            const nullFields = Object.entries(obj)
                .filter(([_, value]) => value === null)
                .map(([key]) => key);

            if (nullFields.length > 5) {
                result.detected = true;
                result.type = AnomalyType.MISSING_FIELDS;
                result.severity = 'low';
                result.message = `Many null fields detected: ${nullFields.join(', ')}`;
                result.details = { nullFields };
            }

            // Check for unusual string patterns (possible injection)
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && value.length > 10000) {
                    result.detected = true;
                    result.type = AnomalyType.MALFORMED_DATA;
                    result.severity = 'low';
                    result.message = `Unusually long string in field: ${key}`;
                    result.details = { field: key, length: value.length };
                }
            }
        }

        return result;
    } catch (error) {
        return {
            detected: false,
            severity: 'low',
            message: 'Data anomaly detection failed',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

// ============================================
// Error Prediction Functions
// ============================================

/**
 * Predicts if an API might fail based on historical data
 */
export function predictAPIFailure(endpoint: string): AnomalyResult {
    try {
        const result = createBaseResult();
        const metric = apiMetrics.get(endpoint);

        if (!metric || metric.totalRequests < 5) {
            // Not enough data to predict
            return result;
        }

        // Check error rate
        if (metric.errorRate > thresholds.maxErrorRate) {
            result.detected = true;
            result.type = AnomalyType.HIGH_ERROR_RATE;
            result.severity = metric.errorRate > 0.7 ? 'critical' : 'high';
            result.message = `High error rate (${(metric.errorRate * 100).toFixed(1)}%) suggests API may fail`;
            result.details = {
                errorRate: metric.errorRate,
                failedRequests: metric.failedRequests,
                totalRequests: metric.totalRequests,
            };
            result.shouldFallback = true;
            result.shouldRetry = true;
            return result;
        }

        // Check success rate
        const successRate = metric.successfulRequests / metric.totalRequests;
        if (successRate < thresholds.minSuccessRate) {
            result.detected = true;
            result.type = AnomalyType.HIGH_ERROR_RATE;
            result.severity = 'medium';
            result.message = `Low success rate (${(successRate * 100).toFixed(1)}%)`;
            result.details = { successRate };
            result.shouldFallback = true;
            return result;
        }

        // Check for increasing response times (degradation)
        if (metric.recentResponseTimes.length >= 5) {
            const recent = metric.recentResponseTimes.slice(-5);
            const earlier = metric.recentResponseTimes.slice(-10, -5);

            if (earlier.length > 0) {
                const recentAvg = calculateRollingAverage(recent);
                const earlierAvg = calculateRollingAverage(earlier);
                const degradation = (recentAvg - earlierAvg) / earlierAvg;

                if (degradation > 0.5) { // 50% degradation
                    result.detected = true;
                    result.type = AnomalyType.SLOW_RESPONSE;
                    result.severity = 'medium';
                    result.message = `Response time degrading: ${(degradation * 100).toFixed(1)}% increase`;
                    result.details = { degradation, recentAvg, earlierAvg };
                    result.shouldFallback = false;
                }
            }
        }

        // Check rate limit hits
        if (metric.rateLimitHits >= thresholds.maxRateLimitHits) {
            result.detected = true;
            result.type = AnomalyType.RATE_LIMIT;
            result.severity = 'high';
            result.message = `Multiple rate limit hits (${metric.rateLimitHits}) indicate API stress`;
            result.details = { rateLimitHits: metric.rateLimitHits };
            result.shouldFallback = true;
            result.shouldRetry = true;
            result.retryAfter = 60000;
        }

        return result;
    } catch (error) {
        return {
            detected: false,
            severity: 'low',
            message: 'Failure prediction failed',
            timestamp: Date.now(),
            shouldFallback: false,
            shouldRetry: false,
        };
    }
}

/**
 * Returns risk level for all monitored APIs
 */
export function getAPIFailureRisk(): Map<string, { risk: AnomalySeverity; metric: APIMetric }> {
    const risks = new Map<string, { risk: AnomalySeverity; metric: APIMetric }>();

    try {
        for (const [endpoint, metric] of apiMetrics.entries()) {
            const prediction = predictAPIFailure(endpoint);

            if (prediction.detected) {
                risks.set(endpoint, { risk: prediction.severity, metric });
            } else if (metric.errorRate > 0.1) {
                risks.set(endpoint, { risk: 'low', metric });
            } else {
                risks.set(endpoint, { risk: 'low', metric });
            }
        }
    } catch (error) {
        // Return empty map on error
    }

    return risks;
}

/**
 * Determines if a request should be retried based on error
 */
export function shouldRetry(error: unknown): { shouldRetry: boolean; retryAfter?: number; maxRetries?: number } {
    try {
        // Default retry strategy
        let shouldRetry = false;
        let retryAfter: number | undefined;
        let maxRetries = 3;

        if (!error) {
            return { shouldRetry: false };
        }

        const errorObj = error as Record<string, unknown>;
        const errorMessage = String(errorObj.message || errorObj.error || '').toLowerCase();
        const statusCode = errorObj.status as number | undefined;

        // Network errors
        if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
            shouldRetry = true;
            retryAfter = 2000;
        }

        // Timeout
        if (errorMessage.includes('timeout') || statusCode === 408) {
            shouldRetry = true;
            retryAfter = 5000;
            maxRetries = 2;
        }

        // Rate limiting
        if (statusCode === 429) {
            shouldRetry = true;
            retryAfter = errorObj.retryAfter
                ? Number(errorObj.retryAfter) * 1000
                : 60000;
            maxRetries = 1;
        }

        // Server errors
        if (statusCode && statusCode >= 500 && statusCode < 600) {
            shouldRetry = true;
            retryAfter = 10000;
        }

        // Client errors - usually don't retry
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            shouldRetry = false;
        }

        return { shouldRetry, retryAfter, maxRetries };
    } catch (error) {
        // Default: allow retry on unknown errors
        return { shouldRetry: true, retryAfter: 2000, maxRetries: 3 };
    }
}

// ============================================
// Monitoring Functions
// ============================================

/**
 * Records API response metrics
 */
export function recordAPIResponse(endpoint: string, duration: number, success: boolean): void {
    try {
        const metric = getOrCreateMetric(endpoint);

        metric.totalRequests += 1;
        metric.lastRequestTime = Date.now();

        if (success) {
            metric.successfulRequests += 1;
        } else {
            metric.failedRequests += 1;
        }

        // Update response times
        metric.recentResponseTimes.push(duration);
        if (metric.recentResponseTimes.length > thresholds.rollingWindowSize) {
            metric.recentResponseTimes.shift();
        }

        metric.avgResponseTime = calculateRollingAverage(metric.recentResponseTimes);
        metric.minResponseTime = Math.min(metric.minResponseTime, duration);
        metric.maxResponseTime = Math.max(metric.maxResponseTime, duration);

        // Calculate error rate
        metric.errorRate = metric.failedRequests / metric.totalRequests;
    } catch (error) {
        // Silently fail - don't break the app
    }
}

/**
 * Gets performance metrics for an endpoint or all endpoints
 */
export function getAPIMetrics(endpoint?: string): APIMetric | Map<string, APIMetric> {
    try {
        if (endpoint) {
            return apiMetrics.get(endpoint) || {
                endpoint,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                minResponseTime: 0,
                maxResponseTime: 0,
                lastRequestTime: 0,
                errorRate: 0,
                rateLimitHits: 0,
                recentResponseTimes: [],
            };
        }
        return new Map(apiMetrics);
    } catch (error) {
        return endpoint ? {
            endpoint,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            minResponseTime: 0,
            maxResponseTime: 0,
            lastRequestTime: 0,
            errorRate: 0,
            rateLimitHits: 0,
            recentResponseTimes: [],
        } : new Map();
    }
}

/**
 * Clears all metrics
 */
export function resetMetrics(): void {
    apiMetrics.clear();
    recentAnomalies.clear();
}

/**
 * Records a rate limit hit
 */
export function recordRateLimitHit(endpoint: string): void {
    try {
        const metric = getOrCreateMetric(endpoint);
        metric.rateLimitHits += 1;
    } catch (error) {
        // Silently fail
    }
}

/**
 * Updates anomaly detection thresholds
 */
export function setThresholds(newThresholds: Partial<AnomalyThresholds>): void {
    thresholds = { ...thresholds, ...newThresholds };
}

/**
 * Gets current thresholds
 */
export function getThresholds(): AnomalyThresholds {
    return { ...thresholds };
}

/**
 * Gets recent anomalies for an endpoint
 */
export function getRecentAnomalies(endpoint?: string): AnomalyResult[] {
    if (endpoint) {
        return recentAnomalies.get(endpoint) || [];
    }

    const all: AnomalyResult[] = [];
    for (const anomalies of recentAnomalies.values()) {
        all.push(...anomalies);
    }
    return all.sort((a, b) => b.timestamp - a.timestamp);
}
