# API Citation Implementation Specification

## Objective
Improve citation UX by decoupling citation identification from presentation numbering.

## Current Problems
1. Citations are numbered by relevance (S1 = most relevant) but appear randomly in text
2. Users see confusing order: [S5]...[S1]...[S3] instead of natural [1]...[2]...[3]
3. API is mixing data concerns (relevance) with presentation concerns (numbering)

## Proposed Solution

### 1. Replace Label System with Unique IDs

**Instead of:**
```json
{
  "text": "Lead generation requires... [S5]...",
  "citations": [
    { "label": "S5", "video_id": "..." }
  ]
}
```

**Use:**
```json
{
  "text": "Lead generation requires... [##cite:abc123##]...",
  "citations": [
    { 
      "id": "abc123",
      "relevance_score": 0.95,
      "video_id": "...",
      "timestamp_start": "10:28",
      "timestamp_end": "11:47"
    }
  ]
}
```

### 2. Citation Marker Format

Use a unique, parseable format that won't conflict with natural text:
- Format: `[##cite:CITATION_ID##]`
- Example: `[##cite:abc123##]`
- The citation ID should match the `id` field in the citations array

### 3. Include Relevance Metadata

Add relevance information as separate data, not as the identifier:

```json
{
  "citations": [
    {
      "id": "abc123",
      "relevance_score": 0.95,  // 0-1 score
      "relevance_rank": 1,       // 1 = most relevant
      "video_id": "video_xyz",
      "playback_id": "mux_abc",
      "video_title": "Growth Strategies",
      "timestamp_start": "10:28",
      "timestamp_end": "11:47",
      "speaker": "Jane Smith",
      "transcript_excerpt": "The key to B2B lead generation..."
    }
  ]
}
```

### 4. LLM Prompt Instructions

Update the LLM prompt to:

```
When citing sources, use the format [##cite:CITATION_ID##] where CITATION_ID 
matches the id field of the relevant citation. Do not use numbered labels like 
[S1] or [1]. The frontend will handle display numbering.

Example:
"Lead generation strategies vary [##cite:abc123##], but content marketing 
remains crucial [##cite:def456##]."
```

### 5. Benefits of This Approach

1. **Separation of Concerns**: API provides data, frontend handles presentation
2. **Flexibility**: Different clients can number differently (by appearance, relevance, or not at all)
3. **Clarity**: Unique IDs prevent confusion between data and display
4. **Future-proof**: Can add more metadata without changing citation format

### 6. Frontend Will Handle

1. Parse text for `[##cite:xxx##]` markers
2. Replace with display format based on UX needs:
   - Academic style: [1], [2], [3] by order of appearance
   - Relevance style: [⭐1], [⭐2] with relevance indicators
   - Minimal style: ¹ ² ³ superscripts
3. Match citations to video players below

## Example Complete Response

```json
{
  "api_version": "2.0",
  "answer": {
    "text": "To generate more leads for Bold Video, focus on content marketing [##cite:vid1_628##] as it provides long-term value. Additionally, LinkedIn advertising [##cite:vid2_1147##] can reach decision-makers effectively. Direct outreach [##cite:vid1_2026##] remains valuable for enterprise clients.",
    "citations": [
      {
        "id": "vid1_628",
        "relevance_score": 0.95,
        "relevance_rank": 1,
        "video_id": "abc123",
        "playback_id": "mux_abc123",
        "video_title": "SaaS Growth Strategies",
        "timestamp_start": "10:28",
        "timestamp_end": "11:47",
        "speaker": "Marketing Expert",
        "transcript_excerpt": "Content marketing is essential for B2B..."
      },
      {
        "id": "vid2_1147",
        "relevance_score": 0.88,
        "relevance_rank": 2,
        "video_id": "def456",
        "playback_id": "mux_def456",
        "video_title": "LinkedIn for B2B",
        "timestamp_start": "19:07",
        "timestamp_end": "19:53",
        "speaker": "Sales Leader",
        "transcript_excerpt": "LinkedIn provides direct access to..."
      },
      {
        "id": "vid1_2026",
        "relevance_score": 0.82,
        "relevance_rank": 3,
        "video_id": "abc123",
        "playback_id": "mux_abc123",
        "video_title": "SaaS Growth Strategies",
        "timestamp_start": "33:46",
        "timestamp_end": "35:11",
        "speaker": "Marketing Expert",
        "transcript_excerpt": "Direct outreach through LinkedIn or email..."
      }
    ]
  }
}
```

## Implementation Notes

### Citation ID Generation
- Should be unique within the response
- Suggested format: `{video_id}_{timestamp_ms}` or UUID
- Must be URL-safe for potential deep linking

### Relevance Scoring
- `relevance_score`: Float between 0-1 indicating match quality
- `relevance_rank`: Integer starting at 1 (most relevant)
- Frontend can use these to visually indicate importance

### Text Generation
- LLM should naturally incorporate citations where relevant
- Avoid clustering all citations at the end
- Each citation should add value to the statement it supports

This approach provides a clean API that separates data from presentation, giving maximum flexibility to frontend implementations.