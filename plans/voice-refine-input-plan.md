# Voice Input for Refine Recommendations

## Problem

The refine recommendations chat box currently only accepts typed input. Users want to use voice input to refine their recommendations.

## Current Implementation

- Main search box has voice input via `toggleVoiceSearch()` function
- Voice results are handled via `setOnResult()` callback which sets `input` state
- Uses Web Speech API via `src/utils/voiceSearch.ts`

## Solution

Add a dedicated voice button to the refine input form that populates `refineInput` instead of the main `input`.

### Changes Needed

1. **Add refine voice state** - New state variable for tracking voice input in refine context

   ```typescript
   const [isRefineListening, setIsRefineListening] = useState(false);
   ```

2. **Add toggle function for refine voice** - Function to start/stop voice for refine

   ```typescript
   const toggleRefineVoiceSearch = () => {
     if (isRefineListening) {
       stopListening();
       setIsRefineListening(false);
     } else {
       if (voiceSupported) {
         // Need to modify voiceSearch to support custom callback
         startListening();
         setIsRefineListening(true);
       }
     }
   };
   ```

3. **Modify voiceSearch to support custom callbacks** - The current implementation uses global callbacks. We need to either:
   - Add ability to pass custom onResult to startListening()
   - Or check which input was active when result comes back

4. **Add voice button to refine input UI** - Add mic button next to refine input (lines ~514-525 in App.tsx)

### Alternative Approach (Simpler)

Add a mode flag to indicate which input to target:

- Track which input user is currently focused on
- When voice result comes, populate the focused input

### Recommended Approach

Since the voice search already uses callbacks, the cleanest solution is to:

1. Add a separate callback setup for refine voice
2. Or modify the voiceSearch module to support targeting different inputs

Let me switch to code mode to implement this.
