export interface Template {
    id: string;
    name: string;
    description: string;
    content: string;
}

export const DOCUMENT_TEMPLATES: Template[] = [
    {
        id: 'api-docs',
        name: 'API Documentation',
        description: 'Standard template for REST API endpoints',
        content: `# API Documentation

## Overview
Brief description of the API and its purpose.

## Base URL
\`https://api.example.com/v1\`

## Authentication
- **Type**: Bearer Token
- **Header**: \`Authorization: Bearer <token>\`

## Endpoints

### 1. Get Resources
**GET** \`/resources\`

#### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | int  | No       | Page number |
| limit| int  | No       | Items per page |

#### Response
\`\`\`json
{
  "data": [],
  "total": 0
}
\`\`\`

### 2. Create Resource
**POST** \`/resources\`

#### Body
\`\`\`json
{
  "name": "string",
  "type": "string"
}
\`\`\`
`
    },
    {
        id: 'design-doc',
        name: 'Technical Design Doc',
        description: 'Template for proposing new features or systems',
        content: `# Technical Design Document: [Feature Name]

## 1. Introduction
### 1.1 Purpose
What problem are we solving?

### 1.2 Scope
What is in scope and out of scope?

## 2. Architecture
### 2.1 High-Level Design
Describe the overall system architecture.

### 2.2 Component Diagram
(Insert Mermaid diagram here)

## 3. Data Model
### 3.1 Schema Changes
List any database changes.

## 4. API Interface
List new or modified API endpoints.

## 5. Implementation Plan
- [ ] Phase 1: Setup
- [ ] Phase 2: Implementation
- [ ] Phase 3: Testing
`
    },
    {
        id: 'bug-report',
        name: 'Bug Report',
        description: 'Structured format for reporting issues',
        content: `# Bug Report: [Issue Title]

## Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What did you expect to happen?

## Actual Behavior
What actually happened?

## Environment
- **OS**: Windows/Mac/Linux
- **Browser**: Chrome/Firefox
- **Version**: x.y.z

## Screenshots
(Paste screenshots here)
`
    },
    {
        id: 'meeting-notes',
        name: 'Meeting Notes',
        description: 'Template for capturing meeting minutes',
        content: `# Meeting Notes: [Date]

## Attendees
- Person A
- Person B

## Agenda
1. Topic 1
2. Topic 2

## Discussion
### Topic 1
Notes...

### Topic 2
Notes...

## Action Items
- [ ] Person A to do X by [Date]
- [ ] Person B to do Y by [Date]
`
    }
];

export interface DiagramTemplate {
    id: string;
    category: 'System Design' | 'Database' | 'Algorithms' | 'General';
    name: string;
    description: string;
    code: string; // Mermaid code
    type: 'mermaid' | 'plantuml';
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
    // System Design
    {
        id: 'microservices',
        category: 'System Design',
        name: 'Microservices Architecture',
        description: 'A typical microservices setup with API Gateway, Services, and Database.',
        type: 'mermaid',
        code: `graph TD
  User[Client] -->|HTTP/REST| Gateway[API Gateway]
  Gateway -->|Auth| Auth[Auth Service]
  Gateway -->|Req| ServiceA[Order Service]
  Gateway -->|Req| ServiceB[Product Service]
  
  ServiceA -->|SQL| DB1[(Order DB)]
  ServiceB -->|SQL| DB2[(Product DB)]
  
  ServiceA -->|Event| Bus[Event Bus/Kafka]
  Bus -->|Sub| ServiceC[Notification Service]
  ServiceC -->|SMTP| Email[Email Provider]`
    },
    {
        id: 'load-balancer',
        category: 'System Design',
        name: 'Load Balancer Cluster',
        description: 'Traffic distribution across multiple server instances.',
        type: 'mermaid',
        code: `graph LR
  Client -->|Request| LB[Load Balancer]
  LB -->|Round Robin| Server1[Server 1]
  LB -->|Round Robin| Server2[Server 2]
  LB -->|Round Robin| Server3[Server 3]
  
  Server1 --> DB[(Database)]
  Server2 --> DB
  Server3 --> DB`
    },

    // Database
    {
        id: 'auth-erd',
        category: 'Database',
        name: 'User Authentication Schema',
        description: 'ER Diagram for a standard authentication system.',
        type: 'mermaid',
        code: `erDiagram
    USERS ||--o{ SESSIONS : has
    USERS ||--o{ POSTS : writes
    USERS {
        int id PK
        string email
        string password_hash
        timestamp created_at
    }
    SESSIONS {
        int id PK
        int user_id FK
        string token
        timestamp expires_at
    }
    POSTS {
        int id PK
        int user_id FK
        string title
        text content
    }`
    },

    // Algorithms
    {
        id: 'binary-tree',
        category: 'Algorithms',
        name: 'Binary Search Tree',
        description: 'Visualization of a BST structure.',
        type: 'mermaid',
        code: `graph TD
  Root((8)) --> L((3))
  Root --> R((10))
  L --> L1((1))
  L --> L2((6))
  R --> R1((null))
  R --> R2((14))
  L2 --> L2L((4))
  L2 --> L2R((7))`
    },
    {
        id: 'linked-list',
        category: 'Algorithms',
        name: 'Linked List',
        description: 'Singly linked list visualization.',
        type: 'mermaid',
        code: `graph LR
  Head[Head] --> Node1
  subgraph List
    direction LR
    Node1[Data: 10 | Next] --> Node2[Data: 20 | Next]
    Node2 --> Node3[Data: 30 | Next]
    Node3 --> Null[Null]
  end`
    }
];
