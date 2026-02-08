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
    },
    {
        id: 'adr',
        name: 'Architecture Decision Record',
        description: 'Capture significant architectural decisions',
        content: `# ADR: [Title]

## Status
Proposed / Accepted / Deprecated

## Context
What is the issue that we're seeing that is motivating this decision or change?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
### Positive
- Benefit 1
- Benefit 2

### Negative
- Drawback 1
- Drawback 2
`
    },
    {
        id: 'prd',
        name: 'Product Requirement Doc',
        description: 'Define requirements for a new product feature',
        content: `# PRD: [Feature Name]

## Problem Alignment
Why are we doing this? What customer problem does it solve?

## User Stories
- As a **user**, I want to **action**, so that **benefit**.
- As a **admin**, I want to **action**, so that **benefit**.

## Functional Requirements
1. The system shall...
2. The user can...

## Non-Functional Requirements
- Performance: < 200ms latency
- Scalability: Support 10k users
`
    },
    {
        id: 'post-mortem',
        name: 'Incident Post-Mortem',
        description: 'Analyze and learn from incidents',
        content: `# Post-Mortem: [Incident Title]

**Date:** [Date]
**Impact:** [Low/Medium/High]
**Root Cause:** [Brief Summary]

## Timeline
- **10:00 UTC**: Alert triggered
- **10:15 UTC**: Engineer acknowledged
- **10:30 UTC**: Fix deployed

## What went wrong?
Detailed technical explanation.

## What went well?
- Detection was fast
- Team communication

## Action Items
- [ ] Fix bug in X
- [ ] Add monitoring for Y
`
    },
    {
        id: 'release-notes',
        name: 'Release Notes',
        description: 'Document changes for a new version',
        content: `# Release Notes v[x.y.z]

## 🚀 New Features
- Feature A: Description
- Feature B: Description

## 🐛 Bug Fixes
- Fixed crash on login
- Resolved UI glitch

## 💔 Breaking Changes
- API Endpoint X changed to Y
`
    },
    {
        id: 'sprint-retro',
        name: 'Sprint Retrospective',
        description: 'Review the past sprint with the team',
        content: `# Sprint Retrospective: [Sprint Name]

## Start
- New tools?
- New processes?

## Stop
- What isn't working?
- Bottlenecks?

## Continue
- What is working well?
- Team wins?

## Action Items
- [ ] Improve CI pipeline
`
    },
    {
        id: 'user-research',
        name: 'User Research Plan',
        description: 'Plan user interviews and testing',
        content: `# User Research Plan

## Objectives
What do we want to learn?

## Methodology
- [ ] User Interviews (Qualitative)
- [ ] A/B Testing (Quantitative)

## Participants
- Segment A: Power users
- Segment B: New sign-ups

## Scripts / Questions
1. How do you currently solve X?
2. What is your biggest pain point with Y?
`
    },
    {
        id: 'db-design',
        name: 'Database Design',
        description: 'Schema design and relationships',
        content: `# Database Design: [Module]

## Entities
### User
- \`id\` (UUID, PK)
- \`email\` (VARCHAR, Unique)

### Order
- \`id\` (UUID, PK)
- \`user_id\` (UUID, FK)

## Relationships
- User -> Order (One-to-Many)

## Indexing Strategy
- Index on \`email\` for lookups
- Compound index on \`status\` + \`created_at\`
`
    },
    {
        id: 'onboarding',
        name: 'Onboarding Guide',
        description: 'Guide for new team members',
        content: `# Welcome to [Team/Project]!

## 🏁 Getting Started
1. Clone the repo
2. Run \`npm install\`
3. Read the \`README.md\`

## 🛠️ Tools We Use
- **Jira**: Task tracking
- **Slack**: #dev-channel
- **DevCanvas**: Documentation

## 📚 Key Resources
- [Architecture Doc](./arch.md)
- [API Utils](./utils.md)
`
    },
    {
        id: 'style-guide',
        name: 'Style Guide',
        description: 'Code style and conventions',
        content: `# Engineering Style Guide

## Naming Conventions
- **Variables**: camelCase
- **Components**: PascalCase
- **Constants**: UPPER_CASE

## Git Workflow
- \`main\` is protected
- Feature branches: \`feat/name\`
- Commit messages: Conventional Commits (\`feat: ...\`)

## Best Practices
- Verify inputs
- Handle errors gracefully
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
    }

    USERS ||--o{ SESSIONS : has
    USERS ||--o{ POSTS : writes`
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
    },
    // Project Management
    {
        id: 'gantt-chart',
        category: 'General',
        name: 'Project Gantt Chart',
        description: 'Project timeline and milestones.',
        type: 'mermaid',
        code: `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Design
    Research           :done,    des1, 2024-01-01, 7d
    Prototyping        :active,  des2, 2024-01-08, 5d
    section Dev
    Backend Impl       :         dev1, 2024-01-15, 10d
    Frontend Impl      :         dev2, after dev1, 7d
    section Test
    QA                 :         test1, after dev2, 5d`
    },
    {
        id: 'git-graph',
        category: 'General',
        name: 'Git Branching Strategy',
        description: 'Visualization of git commits and branches.',
        type: 'mermaid',
        code: `gitGraph
commit
commit
    branch develop
    checkout develop
commit
commit
    branch feature / auth
    checkout feature / auth
commit
commit
    checkout develop
    merge feature / auth
    checkout main
    merge develop
    commit tag: "v1.0"`
    },
    {
        id: 'mind-map',
        category: 'General',
        name: 'Brainstorming Mind Map',
        description: 'Hierarchical mind map for ideas.',
        type: 'mermaid',
        code: `mindmap
root((DevCanvas))
Features
Visualizations
Flowcharts
        Sequence Diagrams
      AI Analysis
        Code Audits
        Bug Detection
    Tech Stack
React
TypeScript
Mermaid
OpenAI`
    },
    {
        id: 'state-diagram',
        category: 'System Design',
        name: 'Login State Machine',
        description: 'State transitions for user authentication.',
        type: 'mermaid',
        code: `stateDiagram - v2
[*]-- > Idle
Idle-- > Authenticating: Click Login
Authenticating-- > Authenticated: Success
Authenticating-- > Error: Failure
Error-- > Idle: Retry
Authenticated-- > [*]: Logout`
    },
    {
        id: 'pie-chart',
        category: 'General',
        name: 'Tech Stack Distribution',
        description: 'Pie chart for data visualization.',
        type: 'mermaid',
        code: `pie title Tech Stack Usage
"TypeScript" : 60
"React" : 25
"CSS" : 10
"HTML" : 5`
    }
];
