# Product Requirements Plan: AI Chat Clarification Loop

## Executive Summary
Enhance the existing AI chat functionality on the home page and Ask page to support a clarification loop, enabling the AI to request additional context from users before providing answers. This creates a more conversational and accurate experience.

## Current State Analysis

### Existing Implementation
- **Home Page** (`app/(default)/page.tsx`): Simple form that redirects to `/ask?q={query}`
- **Ask Page** (`app/(default)/ask/page.tsx`): Displays query results using AskResult component
- **AskResult Component** (`components/ask-result.tsx`): 
  - Fetches answers via POST to `/api/ask-global`
  - Displays AI response with citations
  - Shows loading states and error handling
  - Renders inline video citations
- **API Route** (`app/api/ask-global/route.ts`): 
  - Forwards requests to BOLD API `/api/v1/ask`
  - Simple pass-through with timeout handling
- **Type Definitions** (`lib/ask.ts`): Fixed response structure expecting synthesized answers

### Limitations of Current Implementation
1. No support for clarification responses
2. No conversation state management
3. Single-turn interactions only
4. Fixed response type expectations

## New Requirements

### API Changes
The BOLD API now supports:
1. **Clarification Mode**: API can request additional context
2. **Conversation IDs**: Maintain context across multiple turns
3. **Response Modes**: 
   - `clarification`: Needs more information
   - `synthesized`: Full answer with citations
   - `retrieval_only`: Just search results
4. **Enhanced Parameters**: 
   - `conversation_id`: Continue existing conversations
   - `mode`: Control query processing behavior
   - `synthesize`: Toggle AI synthesis

## Implementation Plan

### Phase 1: Update Type Definitions

#### 1.1 Extend Response Types (`lib/ask.ts`)
```typescript
// Add new response mode types
export type AskMode = "clarification" | "synthesized" | "retrieval_only";

// Clarification response structure
export type ClarificationResponse = {
  mode: "clarification";
  success: true;
  needs_clarification: true;
  clarifying_questions: string[];
  missing_dimensions: string[];
  original_query: string;
  conversation_id: string;
};

// Update main response type
export type AskResponse = 
  | ClarificationResponse
  | SynthesizedResponse
  | RetrievalOnlyResponse;
```

### Phase 2: Update API Route

#### 2.1 Enhanced API Handler (`app/api/ask-global/route.ts`)
- Accept additional parameters:
  - `conversation_id`: Pass through for conversation continuity
  - `mode`: Default to "enhanced"
  - `synthesize`: Default to "true"
- Forward all parameters to BOLD API
- Handle different response types appropriately

### Phase 3: Implement Clarification UI

#### 3.1 Create Clarification Component (`components/ask-clarification.tsx`)
New component to handle clarification interactions:
- Display clarifying questions as interactive cards
- Show "missing dimensions" as context hints
- Provide input field for user's clarification response
- Include "Skip" option to proceed with assumptions
- Maintain conversation_id for continuity

#### 3.2 Update AskResult Component (`components/ask-result.tsx`)
- Detect clarification responses
- Conditionally render clarification UI
- Store conversation_id in component state
- Handle clarification submissions
- Transition to answer display after clarification

### Phase 4: Enhance User Experience

#### 4.1 Add Conversation State Management
- Track conversation_id in URL params or session storage
- Maintain conversation history
- Show conversation context breadcrumbs

#### 4.2 Improve Loading States
- Different loading messages for initial vs. clarification requests
- Show "Understanding your context..." for clarifications
- Display "Generating personalized answer..." for final response

#### 4.3 Add Visual Indicators
- Badge showing conversation turn (1st question, clarification, final answer)
- Timeline showing conversation flow
- Highlight assumptions made by AI

### Phase 5: Home Page Integration

#### 5.1 Update Home Page (`app/(default)/page.tsx`)
- No changes needed initially (continues to redirect to /ask)
- Future: Consider inline clarification on home page

## Detailed Implementation Steps

### Step 1: Type System Updates
```typescript
// lib/ask.ts additions
export interface ClarificationResponse {
  mode: "clarification";
  success: boolean;
  needs_clarification: true;
  clarifying_questions: string[];
  missing_dimensions: string[];
  original_query: string;
  conversation_id: string;
}

export interface SynthesizedResponse {
  mode: "synthesized";
  success: boolean;
  query: string;
  expanded_queries: string[];
  assumptions_made?: string[];
  conversation_id: string;
  answer: AskAnswer;
  retrieval: AskRetrieval;
  processing_time_ms: number;
}

export type AskResponse = ClarificationResponse | SynthesizedResponse | RetrievalOnlyResponse;
```

### Step 2: API Route Enhancement
```typescript
// Update processAsk function to include all parameters
async function processAsk(
  query: string, 
  conversationId?: string,
  mode: string = "enhanced",
  synthesize: string = "true"
) {
  const params = new URLSearchParams({
    q: query,
    mode,
    synthesize,
    ...(conversationId && { conversation_id: conversationId })
  });
  
  // Make request with all parameters
  const endpoint = `${baseUrl}/api/v1/ask?${params}`;
  // ... rest of implementation
}
```

### Step 3: Clarification Component
```tsx
// components/ask-clarification.tsx
interface AskClarificationProps {
  response: ClarificationResponse;
  onSubmit: (clarification: string) => void;
  onSkip: () => void;
}

export function AskClarification({ response, onSubmit, onSkip }: AskClarificationProps) {
  // Render clarifying questions
  // Provide input for user response
  // Handle submission with conversation_id
}
```

### Step 4: AskResult Component Updates
```tsx
// Add conversation state
const [conversationId, setConversationId] = useState<string | null>(null);
const [clarificationHistory, setClarificationHistory] = useState<string[]>([]);

// Handle different response modes
if (response.mode === "clarification") {
  return <AskClarification 
    response={response}
    onSubmit={handleClarificationSubmit}
    onSkip={handleSkip}
  />;
}

// Continue with existing synthesized response handling
```

## UI/UX Specifications

### Clarification Interface
1. **Question Display**:
   - Card-based layout for each clarifying question
   - Icon indicating question type
   - Example answers as placeholders

2. **User Input**:
   - Text area for detailed response
   - Quick-select buttons for common responses
   - "I'm not sure" option

3. **Navigation**:
   - "Continue with assumptions" button
   - "Start over" option
   - Progress indicator showing conversation stage

### Visual Design
- Maintain existing design system
- Use subtle animations for transitions
- Highlight active clarification step
- Show conversation context persistently

## Technical Considerations

### State Management
- Use URL parameters for conversation_id to enable sharing
- Implement session storage for conversation history
- Clear conversation after timeout (15 minutes)

### Error Handling
- Handle expired conversation_id gracefully
- Provide retry mechanism for failed clarifications
- Fall back to simple mode on repeated failures

### Performance
- Cache clarification responses
- Implement optimistic UI updates
- Preload potential follow-up questions

## Testing Strategy

### Unit Tests
- Response type discrimination
- Conversation ID management
- Parameter forwarding

### Integration Tests
- Full clarification flow
- Error scenarios
- Timeout handling

### User Acceptance Criteria
1. User can see clarifying questions when needed
2. User can provide clarification and get refined answer
3. User can skip clarification and proceed with assumptions
4. Conversation context is maintained across turns
5. Loading states accurately reflect current operation

## Migration Strategy

### Backward Compatibility
- Support existing direct answer flow
- Default to enhanced mode for new queries
- Gracefully handle old response formats

### Rollout Plan
1. Deploy type updates and API changes
2. Add clarification UI components
3. Enable clarification mode for subset of queries
4. Monitor and adjust based on usage
5. Full rollout with documentation

## Success Metrics

### Technical Metrics
- Clarification completion rate
- Average conversation depth
- Response time per turn
- Error rate reduction

### User Metrics
- Answer satisfaction scores
- Clarification abandonment rate
- Feature adoption rate
- User feedback sentiment

## Timeline

### Week 1
- Type system updates
- API route enhancements
- Basic clarification component

### Week 2
- Full clarification UI
- Conversation state management
- Testing and refinement

### Week 3
- Edge case handling
- Performance optimization
- Documentation and rollout

## Risk Mitigation

### Technical Risks
- **API Timeout**: Implement proper timeout handling with user feedback
- **State Loss**: Use persistent storage for conversation context
- **Type Safety**: Comprehensive type guards for response discrimination

### User Experience Risks
- **Confusion**: Clear labeling and help text
- **Abandonment**: Provide skip options and progress indicators
- **Frustration**: Limit clarification rounds to 2-3 maximum

## Appendix: Code Examples

### Response Type Guard
```typescript
export function isClarificationResponse(
  response: AskResponse
): response is ClarificationResponse {
  return response.mode === "clarification" && 
         "needs_clarification" in response;
}
```

### Clarification Submission Handler
```typescript
const handleClarificationSubmit = async (clarification: string) => {
  const params = new URLSearchParams({
    q: clarification,
    conversation_id: conversationId!
  });
  
  const response = await fetch(`/api/ask-global?${params}`);
  // Handle response...
};
```

## Conclusion

This implementation plan provides a comprehensive approach to adding clarification loop functionality while maintaining the existing user experience for direct answers. The phased approach ensures backward compatibility and allows for iterative refinement based on user feedback.