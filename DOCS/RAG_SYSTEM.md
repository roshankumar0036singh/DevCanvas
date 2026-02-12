# RAG System (Retrieval Augmented Generation)

The RAG system enables the "Chat with Codebase" feature. It indexes the repository into a vector database to allow semantic search.

## Ingestion Pipeline

1.  **Fetch**: Retries file tree from GitHub API.
2.  **Filter**: Selects relevant source files (`.ts`, `.js`, `.py`, etc.), ignoring lockfiles and assets.
3.  **Chunk**: Splits code into manageably sized chunks (e.g., 1000 characters) using `RecursiveCharacterTextSplitter`.
4.  **Embed**: Generates vector embeddings using `text-embedding-3-small`.
5.  **Index**: Upserts vectors to **Pinecone**.

## Query Pipeline

1.  **User Query**: "How does authentication work?"
2.  **Embed**: Query is converted to a vector.
3.  **Search**: Pinecone returns top 5 relevant code chunks.
4.  **Context**: Chunks are appended to the system prompt.
5.  **Completion**: LLM generates an answer based on the provided code.

## Configuration

RAG settings are managed in `src/utils/rag/config.ts`.
