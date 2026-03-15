import { SentimentResult, MediaSentimentSummary, SentimentType, TMDBReview, MediaRecommendation } from '../types';

// Positive words list for sentiment analysis
const POSITIVE_WORDS = new Set([
    'amazing', 'awesome', 'beautiful', 'best', 'brilliant', 'excellent', 'fantastic',
    'great', 'good', 'gorgeous', 'incredible', 'love', 'loved', 'lovely', 'outstanding',
    'perfect', 'superb', 'wonderful', 'magnificent', 'masterpiece', 'enjoyable',
    'entertaining', 'fun', 'hilarious', 'impressive', 'inspiring', 'moving', 'powerful',
    'riveting', 'terrific', 'thrilling', 'touching', 'uplifting', 'satisfying',
    'engaging', 'clever', 'smart', 'funny', 'charming', 'delightful', 'exquisite',
    'fabulous', 'marvelous', 'phenomenal', 'remarkable', 'stunning', 'breathtaking',
    'emotional', 'heartwarming', 'poignant', 'thought-provoking', 'captivating',
    'addictive', 'addicting', 'unforgettable', 'iconic', 'legendary', 'epic',
    'must-watch', 'recommend', 'recommended', 'must-see', 'worth', 'worthwhile',
    'positive', 'happy', 'pleased', 'satisfied', 'impressed', 'enraptured', 'enthralled',
    'mesmerizing', 'gripping', 'intense', 'compelling', 'absorbing', 'engrossing'
]);

// Negative words list for sentiment analysis
const NEGATIVE_WORDS = new Set([
    'awful', 'bad', 'boring', 'terrible', 'horrible', 'worst', 'poor', 'disappointing',
    'dull', 'mediocre', 'weak', 'bad', 'waste', 'tiring', 'annoying', 'frustrating',
    'painful', 'agonizing', 'unbearable', 'dreadful', 'appalling', 'atrocious',
    'miserable', 'pathetic', 'ridiculous', 'stupid', 'silly', 'absurd', 'nonsense',
    'overrated', 'overhyped', 'underwhelming', 'forgettable', 'unmemorable', 'generic',
    'clichéd', 'cliche', 'predictable', 'stale', 'tired', 'hackneyed', 'trite',
    'lacks', 'lacking', 'missing', 'without', 'no', 'not', 'nothing', 'nowhere',
    'failed', 'fails', 'failing', 'disaster', 'catastrophe', 'mess', 'muddled',
    'confusing', 'confused', 'coherent', 'cohesion', 'pacing', 'slow', 'sluggish',
    '拖沓', '无聊', '差劲', '糟糕' // Chinese for boring, bad, terrible
]);

// Positive emoticons
const POSITIVE_EMOTICONS = [
    ':)', ':-)', ':D', ':-D', ':P', ':-P', ';)', ';-)', '<3', '♥', '❤', '😀', '😃',
    '😄', '😁', '😊', '😍', '🥰', '😘', '🤩', '😎', '👍', '👏', '🎉', '✨', '🔥'
];

// Negative emoticons
const NEGATIVE_EMOTICONS = [
    ':(', ':-(', ':[', ':-[', ':{', ':-{', ":'(", ":'-(", '😢', '😭', '😤', '😠',
    '😡', '👎', '💔', '💯' // Note: 100 can be positive or negative depending on context
];

// Intensifiers
const INTENSIFIERS = new Set([
    'very', 'really', 'extremely', 'absolutely', 'completely', 'totally', 'utterly',
    'highly', 'incredibly', 'amazingly', 'particularly', 'especially', 'so', 'too',
    'most', 'quite', 'rather', 'pretty', 'super', 'mega', 'ultra', 'wild', 'dead'
]);

// Negation words
const NEGATIONS = new Set([
    'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'none',
    "n't", 'dont', "don't", 'doesnt', "doesn't", 'didnt', "didn't", 'wont', "won't",
    'wouldnt', "wouldn't", 'couldnt', "couldn't", 'shouldnt', "shouldn't",
    'wasnt', "wasn't", 'isnt', "isn't", 'havent', "haven't", 'hasnt', "hasn't",
    'without', 'lack', 'lacking', 'lacks'
]);

/**
 * Analyzes the sentiment of a single review
 * @param review - The review text to analyze
 * @returns SentimentResult with sentiment type, score, confidence, and keywords
 */
export function analyzeReviewSentiment(review: string): SentimentResult {
    try {
        if (!review || typeof review !== 'string' || review.trim().length === 0) {
            return {
                sentiment: 'neutral',
                score: 0,
                confidence: 0,
                keywords: []
            };
        }

        const lowerReview = review.toLowerCase();
        const words = lowerReview.split(/\s+/);
        const foundKeywords: string[] = [];

        let positiveCount = 0;
        let negativeCount = 0;
        let intensifierCount = 0;
        let negationActive = false;
        let exclamationCount = 0;
        let questionCount = 0;
        let emoticonScore = 0;

        // Count emoticons
        for (const emoticon of POSITIVE_EMOTICONS) {
            if (lowerReview.includes(emoticon)) {
                emoticonScore += 1;
                foundKeywords.push(emoticon);
            }
        }
        for (const emoticon of NEGATIVE_EMOTICONS) {
            if (lowerReview.includes(emoticon)) {
                emoticonScore -= 1;
                foundKeywords.push(emoticon);
            }
        }

        // Count punctuation
        exclamationCount = (review.match(/!/g) || []).length;
        questionCount = (review.match(/\?/g) || []).length;

        // Process words
        for (let i = 0; i < words.length; i++) {
            const word = words[i].replace(/[^a-zA-Z'-]/g, '');

            // Check for negation
            if (NEGATIONS.has(word) || word.includes("n't")) {
                negationActive = true;
                foundKeywords.push(word);
                continue;
            }

            // Check for intensifiers
            if (INTENSIFIERS.has(word)) {
                intensifierCount++;
                foundKeywords.push(word);
                continue;
            }

            // Check for positive words
            if (POSITIVE_WORDS.has(word)) {
                if (negationActive) {
                    negativeCount++; // "not good" = negative
                    foundKeywords.push(`not ${word}`);
                } else {
                    positiveCount++;
                    foundKeywords.push(word);
                }
                negationActive = false;
                continue;
            }

            // Check for negative words
            if (NEGATIVE_WORDS.has(word)) {
                if (negationActive) {
                    positiveCount++; // "not bad" = positive
                    foundKeywords.push(`not ${word}`);
                } else {
                    negativeCount++;
                    foundKeywords.push(word);
                }
                negationActive = false;
                continue;
            }

            // Reset negation after a few words
            if (negationActive && i > 0 && i - (words[i - 1]?.includes("n't") ? i : 0) > 2) {
                negationActive = false;
            }
        }

        // Calculate base score
        let score = 0;
        const totalSentimentWords = positiveCount + negativeCount;

        if (totalSentimentWords > 0) {
            score = (positiveCount - negativeCount) / totalSentimentWords;
        }

        // Add emoticon contribution
        if (emoticonScore !== 0) {
            score = (score + (emoticonScore > 0 ? 0.3 : -0.3)) / 1.6;
        }

        // Add intensifier contribution
        if (intensifierCount > 0 && totalSentimentWords > 0) {
            const intensifierBoost = Math.min(intensifierCount * 0.1, 0.3);
            score = score > 0 ? score + intensifierBoost : score - intensifierBoost;
        }

        // Add punctuation contribution
        if (exclamationCount > 2) {
            score = score > 0 ? score + 0.1 : score - 0.1;
        }
        if (questionCount > 2) {
            score = score > 0 ? score - 0.05 : score + 0.05;
        }

        // Clamp score to [-1, 1]
        score = Math.max(-1, Math.min(1, score));

        // Calculate confidence
        let confidence = 0;
        if (totalSentimentWords > 0) {
            confidence = Math.min(totalSentimentWords / 5, 1); // Max confidence at 5+ sentiment words
        }
        if (emoticonScore !== 0) {
            confidence = Math.min(confidence + 0.3, 1);
        }
        confidence = Math.max(confidence, 0.1); // Minimum confidence

        // Determine sentiment type
        let sentiment: SentimentType;
        if (score > 0.1) {
            sentiment = 'positive';
        } else if (score < -0.1) {
            sentiment = 'negative';
        } else {
            sentiment = 'neutral';
        }

        return {
            sentiment,
            score: Math.round(score * 100) / 100,
            confidence: Math.round(confidence * 100) / 100,
            keywords: [...new Set(foundKeywords)].slice(0, 10) // Limit to 10 unique keywords
        };
    } catch (error) {
        // Fallback mechanism - return neutral/default values on error
        console.warn('Sentiment analysis failed, returning neutral result:', error);
        return {
            sentiment: 'neutral',
            score: 0,
            confidence: 0,
            keywords: []
        };
    }
}

/**
 * Analyzes multiple reviews for a movie and returns a summary
 * @param reviews - Array of TMDB reviews to analyze
 * @returns MediaSentimentSummary with overall sentiment and statistics
 */
export function analyzeMediaSentiment(reviews: TMDBReview[]): MediaSentimentSummary {
    try {
        if (!Array.isArray(reviews) || reviews.length === 0) {
            return {
                overallSentiment: 'neutral',
                averageScore: 0,
                positivePercentage: 0,
                negativePercentage: 0,
                neutralPercentage: 100,
                reviewCount: 0
            };
        }

        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;
        let totalScore = 0;

        for (const review of reviews) {
            if (!review.content || typeof review.content !== 'string') {
                neutralCount++;
                continue;
            }

            const result = analyzeReviewSentiment(review.content);

            switch (result.sentiment) {
                case 'positive':
                    positiveCount++;
                    break;
                case 'negative':
                    negativeCount++;
                    break;
                default:
                    neutralCount++;
            }

            totalScore += result.score;
        }

        const reviewCount = reviews.length;
        const averageScore = reviewCount > 0 ? Math.round((totalScore / reviewCount) * 100) / 100 : 0;

        const positivePercentage = reviewCount > 0
            ? Math.round((positiveCount / reviewCount) * 100)
            : 0;
        const negativePercentage = reviewCount > 0
            ? Math.round((negativeCount / reviewCount) * 100)
            : 0;
        const neutralPercentage = reviewCount > 0
            ? Math.round((neutralCount / reviewCount) * 100)
            : 0;

        let overallSentiment: SentimentType;
        if (averageScore > 0.1) {
            overallSentiment = 'positive';
        } else if (averageScore < -0.1) {
            overallSentiment = 'negative';
        } else {
            overallSentiment = 'neutral';
        }

        return {
            overallSentiment,
            averageScore,
            positivePercentage,
            negativePercentage,
            neutralPercentage,
            reviewCount
        };
    } catch (error) {
        // Fallback mechanism - return neutral/default values on error
        console.warn('Media sentiment analysis failed, returning neutral result:', error);
        return {
            overallSentiment: 'neutral',
            averageScore: 0,
            positivePercentage: 0,
            negativePercentage: 0,
            neutralPercentage: 100,
            reviewCount: 0
        };
    }
}

/**
 * Returns a human-readable description of sentiment based on score
 * @param score - The sentiment score (-1 to 1)
 * @returns Human-readable description string
 */
export function getSentimentDescription(score: number): string {
    try {
        if (typeof score !== 'number' || isNaN(score)) {
            return 'Unable to analyze sentiment';
        }

        // Clamp score
        score = Math.max(-1, Math.min(1, score));

        if (score >= 0.8) {
            return 'Exceptionally positive';
        } else if (score >= 0.6) {
            return 'Very positive';
        } else if (score >= 0.4) {
            return 'Positive';
        } else if (score >= 0.2) {
            return 'Slightly positive';
        } else if (score >= 0) {
            return 'Neutral to slightly positive';
        } else if (score >= -0.2) {
            return 'Neutral to slightly negative';
        } else if (score >= -0.4) {
            return 'Negative';
        } else if (score >= -0.6) {
            return 'Very negative';
        } else if (score >= -0.8) {
            return 'Extremely negative';
        } else {
            return 'Exceptionally negative';
        }
    } catch (error) {
        // Fallback mechanism
        return 'Sentiment analysis unavailable';
    }
}

/**
 * Filters recommendations based on minimum sentiment score
 * @param recommendations - Array of MediaRecommendation to filter
 * @param minScore - Minimum sentiment score threshold (-1 to 1)
 * @returns Filtered array of recommendations
 */
export function filterBySentiment(
    recommendations: MediaRecommendation[],
    minScore: number
): MediaRecommendation[] {
    try {
        if (!Array.isArray(recommendations)) {
            return [];
        }

        // Validate minScore
        if (typeof minScore !== 'number' || isNaN(minScore)) {
            minScore = 0;
        }
        minScore = Math.max(-1, Math.min(1, minScore));

        return recommendations.filter((recommendation) => {
            if (!recommendation.reviews || !Array.isArray(recommendation.reviews)) {
                // If no reviews, include by default (can't filter out)
                return true;
            }

            const sentiment = analyzeMediaSentiment(recommendation.reviews as TMDBReview[]);
            return sentiment.averageScore >= minScore;
        });
    } catch (error) {
        // Fallback mechanism - return original array on error
        console.warn('Sentiment filtering failed, returning original list:', error);
        return recommendations;
    }
}

/**
 * Boosts recommendations based on sentiment analysis
 * This adjusts match percentages based on how positive the reviews are
 * @param recommendations - Array of MediaRecommendation to boost
 * @returns Array of recommendations with adjusted match percentages
 */
export function boostBySentiment(recommendations: MediaRecommendation[]): MediaRecommendation[] {
    try {
        if (!Array.isArray(recommendations) || recommendations.length === 0) {
            return [];
        }

        return recommendations.map((recommendation) => {
            // Clone to avoid mutation
            const boosted = { ...recommendation };

            // Analyze sentiment from reviews
            const sentiment = analyzeMediaSentiment(
                (recommendation.reviews || []) as TMDBReview[]
            );

            // Calculate boost factor based on sentiment
            // Positive reviews boost by up to 10%, negative reduce by up to 10%
            let boostFactor = 0;

            if (sentiment.reviewCount > 0) {
                // More weight if there are more reviews
                const reviewWeight = Math.min(sentiment.reviewCount / 5, 1);

                if (sentiment.averageScore > 0) {
                    // Positive sentiment: boost
                    boostFactor = sentiment.averageScore * 10 * reviewWeight;
                } else if (sentiment.averageScore < 0) {
                    // Negative sentiment: reduce
                    boostFactor = sentiment.averageScore * 10 * reviewWeight;
                }
            }

            // Apply boost to match percentage
            boosted.matchPercentage = Math.max(
                0,
                Math.min(100, boosted.matchPercentage + boostFactor)
            );

            // Round to nearest integer
            boosted.matchPercentage = Math.round(boosted.matchPercentage);

            // Add sentiment data to recommendation for display
            (boosted as any).sentiment = sentiment;

            return boosted;
        });
    } catch (error) {
        // Fallback mechanism - return original recommendations on error
        console.warn('Sentiment boosting failed, returning original list:', error);
        return recommendations;
    }
}

/**
 * Get sentiment stats for a single movie/recommendation
 * @param recommendation - MediaRecommendation to analyze
 * @returns MediaSentimentSummary
 */
export function getRecommendationSentiment(
    recommendation: MediaRecommendation
): MediaSentimentSummary {
    try {
        const reviews = (recommendation.reviews || []) as TMDBReview[];
        return analyzeMediaSentiment(reviews);
    } catch (error) {
        return {
            overallSentiment: 'neutral',
            averageScore: 0,
            positivePercentage: 0,
            negativePercentage: 0,
            neutralPercentage: 100,
            reviewCount: 0
        };
    }
}
