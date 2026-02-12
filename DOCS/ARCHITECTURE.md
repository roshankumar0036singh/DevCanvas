# Architecture

## AI Service - OpenAI & Mistral

```mermaid
graph TD
    User[User] -->|Click| Ext[Extension Popup]
    Ext -->|Message| BG[Background Service Worker]
    
    subgraph Core
        BG -->|"Fetch"| GitHub["GitHub API"]
        BG -->|"Analyze"| AI["AI Service (OpenAI/Mistral)"]
        BG -->|"Store"| Storage["Chrome Storage"]
    end
    
    subgraph RAG System
        AI -->|"Embedding"| VectorDB["Pinecone"]
        VectorDB -->|"Context"| AI
    end
    
    subgraph Visualization
        Ext -->|"Render"| ReactFlow["React Flow Canvas"]
        Ext -->|"Render"| Mermaid["Mermaid.js Renderer"]
    end
```

## Key Modules

| Module | Purpose |
| :--- | :--- |
| **Content Script** | Injects UI overlay into GitHub DOM. |
| **Background** | Handles API calls, Storage, and AI processing off-main-thread. |
| **Popup** | The main React application where diagrams are rendered. |
| **Parser** | Converts raw file trees into graph structures (`structureParser.ts`). |
