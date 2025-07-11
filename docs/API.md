# Polisee API Documentation

## Overview

The Polisee API provides endpoints for bill analysis, user persona management, and feedback collection. All API endpoints are RESTful and return JSON responses.

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.polisee.com
```

## Authentication

Most endpoints require authentication via Supabase Auth. Include the authentication token in the Authorization header:

```
Authorization: Bearer YOUR_AUTH_TOKEN
```

## Endpoints

### Bill Analysis

#### Generate Personalized Analysis

```http
POST /api/analyze-bill
```

Generates a personalized analysis of a bill based on user persona.

**Request Body:**
```json
{
  "billId": "hr1234-119",
  "personaId": "uuid",
  "forceRegenerate": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "billId": "hr1234-119",
    "personaId": "uuid",
    "impacts": [
      {
        "category": "Education",
        "title": "Increased K-12 Funding",
        "description": "This bill allocates $10B in additional funding...",
        "sentiment": "positive",
        "sources": [
          {
            "text": "Section 102(a) provides for...",
            "page": 42,
            "coordinates": { "x": 100, "y": 200 }
          }
        ]
      }
    ],
    "generatedAt": "2025-01-15T10:00:00Z"
  }
}
```

#### Get Cached Analysis

```http
GET /api/ai-summary/[billId]
```

Retrieves cached analysis for a specific bill and user.

**Query Parameters:**
- `personaId` (optional) - Filter by specific persona

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "...",
    "impacts": [...],
    "cachedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Bill Management

#### Search Bills

```http
GET /api/search-bills
```

Search for legislative bills with filtering options.

**Query Parameters:**
- `q` - Search query
- `status` - Bill status (introduced, passed_house, passed_senate, enacted)
- `sponsor` - Sponsor name
- `committee` - Committee name
- `dateFrom` - Start date (YYYY-MM-DD)
- `dateTo` - End date (YYYY-MM-DD)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "id": "hr1234-119",
        "title": "Education Funding Act of 2025",
        "summary": "A bill to increase federal education funding...",
        "sponsor": "Rep. Jane Doe",
        "status": "introduced",
        "introducedDate": "2025-01-10",
        "lastAction": "Referred to Committee on Education",
        "pdfUrl": "https://storage.polisee.com/bills/hr1234-119.pdf"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### Get Bill Details

```http
GET /api/bills/[billId]
```

Get detailed information about a specific bill.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "hr1234-119",
    "title": "Education Funding Act of 2025",
    "fullText": "...",
    "summary": "...",
    "sponsor": {
      "name": "Rep. Jane Doe",
      "party": "D",
      "state": "CA"
    },
    "cosponsors": [...],
    "actions": [...],
    "committees": [...],
    "relatedBills": [...],
    "pdfUrl": "..."
  }
}
```

### User Feedback

#### Submit Bill Sentiment

```http
POST /api/vote-bill
```

Submit user sentiment feedback for a bill or specific section.

**Request Body:**
```json
{
  "billId": "hr1234-119",
  "sentiment": "positive|negative|neutral",
  "sectionId": "section-102a",
  "comment": "This would greatly help my school district...",
  "impactCategory": "Education"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "feedbackId": "uuid",
    "recorded": true
  }
}
```

### Representative Communication

#### Generate Representative Message

```http
POST /api/generate-representative-message
```

Generate a message to send to representatives about a bill.

**Request Body:**
```json
{
  "billId": "hr1234-119",
  "stance": "support|oppose",
  "personalStory": "As a teacher with 15 years experience...",
  "keyPoints": ["education_funding", "teacher_shortage"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Dear Representative...",
    "representatives": [
      {
        "name": "Rep. Jane Doe",
        "email": "contact@repdoe.house.gov",
        "phone": "(202) 555-0123"
      }
    ]
  }
}
```

#### Send Representative Message

```http
POST /api/send-representative-message
```

Send the generated message to representatives.

**Request Body:**
```json
{
  "messageId": "uuid",
  "recipientIds": ["rep-uuid-1", "rep-uuid-2"],
  "method": "email|phone|mail"
}
```

### Batch Processing

#### Generate Batch Summaries

```http
POST /api/batch-summaries
```

Generate AI summaries for multiple bills in batch.

**Request Body:**
```json
{
  "billIds": ["hr1234-119", "s5678-119"],
  "options": {
    "forceRegenerate": false,
    "priority": "high|normal|low"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "uuid",
    "status": "processing",
    "totalBills": 2,
    "estimatedTime": "5 minutes"
  }
}
```

### Web Search

#### Search Web for Bill Information

```http
POST /api/web-search
```

Search the web for additional information about bills or policy topics.

**Request Body:**
```json
{
  "query": "HR 1234 education funding impact",
  "sources": ["news", "gov", "advocacy"]
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `AUTH_REQUIRED` - Authentication required
- `AUTH_INVALID` - Invalid authentication token
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request parameters
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error

## Rate Limits

- **Authenticated users**: 100 requests per minute
- **Analysis generation**: 10 requests per hour
- **Batch processing**: 5 concurrent batches

## Webhooks

Configure webhooks to receive real-time updates:

```http
POST /api/webhooks/configure
```

**Events:**
- `analysis.completed` - Analysis generation finished
- `bill.updated` - Bill information updated
- `feedback.received` - New user feedback

## SDKs

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- Go

See [SDK Documentation](https://docs.polisee.com/sdks) for installation and usage.

## Examples

### JavaScript/TypeScript

```typescript
import { PoliseeClient } from '@polisee/sdk';

const client = new PoliseeClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.polisee.com'
});

// Search bills
const bills = await client.bills.search({
  query: 'education funding',
  status: 'introduced'
});

// Generate analysis
const analysis = await client.analysis.generate({
  billId: 'hr1234-119',
  personaId: 'user-persona-id'
});
```

### cURL

```bash
# Search bills
curl -X GET "https://api.polisee.com/api/search-bills?q=education" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Submit feedback
curl -X POST "https://api.polisee.com/api/vote-bill" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billId": "hr1234-119",
    "sentiment": "positive",
    "comment": "This will help my community"
  }'
```

## Support

For API support:
- Email: api-support@polisee.com
- Documentation: https://docs.polisee.com
- Status Page: https://status.polisee.com 