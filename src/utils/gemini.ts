import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

export interface AIRecommendation {
  title: string;
  year?: number;
  explanation: string;
}

export interface GeminiRecommendationResult {
  recommendations: AIRecommendation[];
  success: boolean;
  error?: string;
}

/**
 * Get movie/TV/anime recommendations from Gemini AI.
 * @param userPrompt - The user's natural language request
 * @param mediaType - 'movie' | 'tv' | 'anime'
 * @param hiddenGems - If true, prioritize lesser-known titles
 * @param freshContext - Optional list of recent titles from TMDB to inject for recency
 */
export async function getAIRecommendations(
  userPrompt: string,
  mediaType: 'movie' | 'tv' | 'anime' = 'movie',
  hiddenGems: boolean = false,
  freshContext?: string[]
): Promise<GeminiRecommendationResult> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const mediaTypeDescriptions = {
      movie: 'movies',
      tv: 'TV series/shows',
      anime: 'anime series or anime movies',
    };

    let contextSection = '';
    if (freshContext && freshContext.length > 0) {
      contextSection = `
Here are some recent releases you may consider if relevant to the user's request:
${freshContext.map((title, i) => `${i + 1}. ${title}`).join('\n')}
`;
    }

    const hiddenGemsInstruction = hiddenGems
      ? 'Prioritize lesser-known, underrated, or hidden gem titles over mainstream popular ones. Focus on critically acclaimed but not widely seen content.'
      : 'You may include popular mainstream titles if they fit well.';

    const systemPrompt = `You are an expert ${mediaTypeDescriptions[mediaType]} recommender with encyclopedic knowledge.

The user will describe what they're looking for. Your job is to recommend exactly 5 ${mediaTypeDescriptions[mediaType]} that match their request.

${hiddenGemsInstruction}

${contextSection}

IMPORTANT RULES:
1. Return ONLY a valid JSON array with exactly 5 objects.
2. Each object must have: "title" (string), "year" (number), "explanation" (string - 1-2 sentences explaining WHY this matches the user's request).
3. Do NOT include any markdown, code blocks, or extra text. Just the raw JSON array.
4. Be specific in your explanations - reference the user's actual request.
5. For regional content (Indian, Bengali, Korean, etc.), include those if relevant.

Example response format:
[{"title": "Movie Name", "year": 2023, "explanation": "This matches because..."}]`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User request: "${userPrompt}"` },
    ]);

    const responseText = result.response.text().trim();
    
    // Clean up potential markdown code blocks
    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonText) as AIRecommendation[];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Invalid response format from AI');
    }

    return {
      recommendations: parsed.slice(0, 5),
      success: true,
    };
  } catch (error) {
    console.error('Gemini AI error:', error);
    return {
      recommendations: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analyze a user prompt to extract mood/intent for fallback heuristics
 */
export async function analyzePromptWithAI(
  userPrompt: string
): Promise<{ genres: string[]; emotions: string[]; intensity: number } | null> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `Analyze the following movie/TV request and extract:
1. genres: array of relevant genre keywords (action, thriller, drama, comedy, romance, horror, sci-fi, fantasy, animation, documentary)
2. emotions: array of emotional tones (suspense, hope, fear, joy, sadness, anger, wonder)
3. intensity: number from 1-10 (1=calm/peaceful, 10=intense/violent)

Return ONLY a valid JSON object with these three keys. No extra text.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Request: "${userPrompt}"` },
    ]);

    const responseText = result.response.text().trim();
    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}
