/**
 * Voice Search Utility
 * Provides hands-free movie discovery using Web Speech API
 */

import {
    VoiceOptions,
    VoiceState,
    VoiceCommand,
    VoiceResult,
    SpeechRecognitionEvent,
    SpeechRecognitionErrorEvent,
    SpeechRecognition,
    DEFAULT_VOICE_OPTIONS,
    VoiceLanguage,
} from '../types';

// ============================================
// State Management
// ============================================

let recognition: SpeechRecognition | null = null;
let currentState: VoiceState = 'idle';
let currentLanguage: VoiceLanguage = 'en-US';
let isSupported: boolean = false;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;

// Callbacks for state changes
let onStateChange: ((state: VoiceState) => void) | null = null;
let onResult: ((result: VoiceResult) => void) | null = null;
let onError: ((error: string) => void) | null = null;
let onCommand: ((command: string, params: string) => void) | null = null;

// Registered voice commands
const voiceCommands: VoiceCommand[] = [];

// ============================================
// Initialization and Support Detection
// ============================================

/**
 * Check if browser supports voice recognition
 */
export function checkSupport(): boolean {
    if (typeof window === 'undefined') {
        isSupported = false;
        return false;
    }

    isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    return isSupported;
}

/**
 * Returns whether voice recognition is supported
 */
export function isVoiceSupported(): boolean {
    if (!isSupported) {
        checkSupport();
    }
    return isSupported;
}

/**
 * Initialize the speech recognition instance
 */
function initializeRecognition(): SpeechRecognition | null {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
        return null;
    }

    const recognizer = new SpeechRecognitionAPI();

    // Configure recognition
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    recognizer.lang = currentLanguage;

    // Set up event handlers
    recognizer.onresult = handleResult;
    recognizer.onerror = handleError;
    recognizer.onend = handleEnd;
    recognizer.onstart = handleStart;
    recognizer.onspeechstart = handleSpeechStart;
    recognizer.onspeechend = handleSpeechEnd;
    recognizer.onaudiostart = handleAudioStart;
    recognizer.onaudioend = handleAudioEnd;

    return recognizer;
}

// ============================================
// Event Handlers
// ============================================

function handleStart(): void {
    setState('listening');
    resetSilenceTimer();
}

function handleResult(event: SpeechRecognitionEvent): void {
    resetSilenceTimer();

    const result = event.results[event.resultIndex];
    const transcript = result[0].transcript.trim();
    const confidence = result[0].confidence || 0;
    const isFinal = result.isFinal;

    if (!transcript) return;

    const voiceResult: VoiceResult = {
        transcript,
        isFinal,
        confidence,
        language: currentLanguage,
        timestamp: Date.now(),
    };

    // Check confidence threshold
    const options = getCurrentOptions();
    if (confidence < (options.confidenceThreshold || 0.5)) {
        // Low confidence - might be noise, ignore
        return;
    }

    if (onResult) {
        onResult(voiceResult);
    }

    // Process as command if final
    if (isFinal && transcript.length > 0) {
        handleVoiceCommands(transcript);
    }
}

function handleError(event: SpeechRecognitionErrorEvent): void {
    console.error('Voice recognition error:', event.error);

    const errorMessage = getErrorMessage(event.error);

    if (onError) {
        onError(errorMessage);
    }

    setState('error');

    // Auto-restart on certain errors
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // Don't restart, just go idle
        setState('idle');
    }
}

function handleEnd(): void {
    // Auto-restart if still in listening mode
    if (currentState === 'listening' && recognition) {
        try {
            recognition.start();
        } catch {
            setState('idle');
        }
    } else if (currentState !== 'idle') {
        setState('idle');
    }
}

function handleSpeechStart(): void {
    if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
    }
}

function handleSpeechEnd(): void {
    resetSilenceTimer();
}

function handleAudioStart(): void {
    // Audio capture started
}

function handleAudioEnd(): void {
    // Audio capture ended
}

function getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'Microphone not available. Please check permissions.',
        'not-allowed': 'Microphone permission denied. Please allow access.',
        'network': 'Network error. Please check your connection.',
        'aborted': 'Voice recognition was cancelled.',
        'language-not-supported': 'The selected language is not supported.',
        'service-not-allowed': 'Voice recognition service is not allowed.',
    };

    return errorMessages[error] || `Voice recognition error: ${error}`;
}

// ============================================
// Silence Detection
// ============================================

function resetSilenceTimer(): void {
    if (silenceTimer) {
        clearTimeout(silenceTimer);
    }

    // Set silence timeout to 5 seconds
    silenceTimer = setTimeout(() => {
        if (currentState === 'listening' && recognition) {
            // Stop listening after silence
            stopListening();
            if (onStateChange) {
                onStateChange('idle');
            }
        }
    }, 5000);
}

function clearSilenceTimer(): void {
    if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
    }
}

// ============================================
// State Management
// ============================================

function setState(newState: VoiceState): void {
    if (currentState !== newState) {
        currentState = newState;
        if (onStateChange) {
            onStateChange(newState);
        }
    }
}

function getCurrentOptions(): VoiceOptions {
    return DEFAULT_VOICE_OPTIONS;
}

// ============================================
// Public API - Voice Recognition
// ============================================

/**
 * Start voice recognition
 */
export function startListening(options?: VoiceOptions): boolean {
    // Check support first
    if (!isVoiceSupported()) {
        if (onError) {
            onError('Voice recognition is not supported in this browser.');
        }
        return false;
    }

    // If already listening, stop first
    if (currentState === 'listening') {
        stopListening();
    }

    // Merge options with defaults
    const mergedOptions = { ...DEFAULT_VOICE_OPTIONS, ...options };
    currentLanguage = mergedOptions.language || 'en-US';

    // Initialize recognition if needed
    if (!recognition) {
        recognition = initializeRecognition();
        if (!recognition) {
            if (onError) {
                onError('Failed to initialize voice recognition.');
            }
            return false;
        }
    }

    // Configure recognition
    recognition.lang = currentLanguage;
    recognition.continuous = mergedOptions.continuous ?? true;
    recognition.interimResults = mergedOptions.interimResults ?? true;
    recognition.maxAlternatives = mergedOptions.maxAlternatives ?? 1;

    try {
        recognition.start();
        return true;
    } catch (error) {
        console.error('Failed to start voice recognition:', error);
        if (onError) {
            onError('Failed to start voice recognition.');
        }
        return false;
    }
}

/**
 * Stop voice recognition
 */
export function stopListening(): void {
    clearSilenceTimer();

    if (recognition && currentState === 'listening') {
        try {
            recognition.stop();
        } catch {
            // Ignore errors when stopping
        }
    }

    setState('idle');
}

/**
 * Get current listening state
 */
export function isListening(): boolean {
    return currentState === 'listening';
}

/**
 * Get current voice state
 */
export function getVoiceState(): VoiceState {
    return currentState;
}

/**
 * Set callback for state changes
 */
export function setOnStateChange(callback: (state: VoiceState) => void): void {
    onStateChange = callback;
}

/**
 * Set callback for voice results
 */
export function setOnResult(callback: (result: VoiceResult) => void): void {
    onResult = callback;
}

/**
 * Set callback for errors
 */
export function setOnError(callback: (error: string) => void): void {
    onError = callback;
}

/**
 * Set callback for commands
 */
export function setOnCommand(callback: (command: string, params: string) => void): void {
    onCommand = callback;
}

// ============================================
// Speech Processing
// ============================================

/**
 * Process voice input - extract search query
 */
export function processVoiceInput(transcript: string): string {
    // Normalize the input first
    const normalized = normalizeVoiceInput(transcript);

    // Try to extract search query from voice commands
    const query = extractQueryFromCommand(normalized);

    return query || normalized;
}

/**
 * Normalize voice input for processing
 */
export function normalizeVoiceInput(text: string): string {
    return text
        .toLowerCase()
        .trim()
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove punctuation at the end
        .replace(/[.,!?]+$/, '')
        // Remove common filler words
        .replace(/\b(um|uh|er|ah|hmm|okay|ok|please|thanks|thank you)\b/gi, '')
        // Clean up extra spaces again
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract search query from voice command patterns
 */
function extractQueryFromCommand(text: string): string | null {
    // Check against registered commands
    for (const command of voiceCommands) {
        for (const pattern of command.patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    }

    // Built-in command patterns
    const builtInPatterns = [
        /^(?:search for|search|find|look for|look up)\s+(.+)/i,
        /^(?:find movies about|show me movies about|search movies about)\s+(.+)/i,
        /^(?:show me|show|get me|find me)\s+(.+)/i,
        /^(?:movies about|movies like|movies similar to)\s+(.+)/i,
        /^(?:recommend|recommend me|can you recommend)\s+(.+)/i,
    ];

    for (const pattern of builtInPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return null;
}

// ============================================
// Voice Commands
// ============================================

/**
 * Register a voice command
 */
export function registerCommand(phrase: string, callback: (params: string) => void): void {
    // Create regex patterns from the phrase
    const patterns = [
        new RegExp(`^${phrase}\\s+(.+)`, 'i'),
        new RegExp(`${phrase}\\s+(.+)`, 'i'),
    ];

    voiceCommands.push({
        phrase,
        callback,
        patterns,
    });
}

/**
 * Handle voice commands from transcript
 */
export function handleVoiceCommands(transcript: string): void {
    const normalized = normalizeVoiceInput(transcript);

    // Try to match against registered commands
    for (const command of voiceCommands) {
        for (const pattern of command.patterns) {
            const match = normalized.match(pattern);
            if (match && match[1]) {
                const params = match[1].trim();
                command.callback(params);

                if (onCommand) {
                    onCommand(command.phrase, params);
                }
                return;
            }
        }
    }

    // If no command matched, treat the whole thing as a search query
    if (onCommand) {
        onCommand('search', normalized);
    }
}

/**
 * Set up built-in voice command listeners
 */
export function addVoiceCommandListeners(): void {
    // Register default movie search commands
    registerCommand('search for', (params) => {
        console.log('Search command:', params);
    });

    registerCommand('find movies about', (params) => {
        console.log('Find movies command:', params);
    });

    registerCommand('show me', (params) => {
        console.log('Show me command:', params);
    });
}

// ============================================
// Language Support
// ============================================

/**
 * Get current language
 */
export function getCurrentLanguage(): VoiceLanguage {
    return currentLanguage;
}

/**
 * Set voice recognition language
 */
export function setLanguage(language: VoiceLanguage): void {
    currentLanguage = language;

    if (recognition) {
        recognition.lang = language;
    }
}

/**
 * Get list of supported languages
 */
export function getSupportedLanguages(): { code: VoiceLanguage; name: string }[] {
    return [
        { code: 'en-US', name: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)' },
        { code: 'hi-IN', name: 'Hindi' },
        { code: 'ja-JP', name: 'Japanese' },
        { code: 'ko-KR', name: 'Korean' },
        { code: 'fr-FR', name: 'French' },
        { code: 'de-DE', name: 'German' },
        { code: 'es-ES', name: 'Spanish' },
    ];
}

// ============================================
// Noise Handling
// ============================================

/**
 * Filter out noise from transcript
 */
export function filterNoise(text: string): string {
    const noisePatterns = [
        /^(um|uh|er|ah|hmm|hm)+/i,
        /(um|uh|er|ah|hmm|hm)+$/i,
        /^\s+/,
        /\s+$/,
    ];

    let filtered = text;

    for (const pattern of noisePatterns) {
        filtered = filtered.replace(pattern, '');
    }

    return filtered.trim();
}

/**
 * Check if transcript is likely noise
 */
export function isLikelyNoise(transcript: string, confidence: number): boolean {
    // Too short
    if (transcript.length < 2) return true;

    // Low confidence
    if (confidence < 0.5) return true;

    // Only contains noise words
    const noiseWords = /^(um|uh|er|ah|hmm|hm|silence|background|noise)+$/i;
    if (noiseWords.test(transcript)) return true;

    return false;
}

// ============================================
// Cleanup
// ============================================

/**
 * Clean up voice recognition resources
 */
export function cleanup(): void {
    stopListening();

    if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
        recognition = null;
    }

    clearSilenceTimer();
    onStateChange = null;
    onResult = null;
    onError = null;
    onCommand = null;
}

// ============================================
// Default initialization
// ============================================

// Initialize support check
checkSupport();

// Set up default commands
addVoiceCommandListeners();
