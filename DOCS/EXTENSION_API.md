# Extension API Reference

DevCanvas uses Chrome's Messaging API for communication between the Popup, Content Script, and Background Worker.

## Message Passing

### `sendMessage`
Sends a payload to the background script.

```typescript
// Type Signature
function sendMessage(type: string, payload: any): Promise<any>;

// Example: Fetch File Tree
const tree = await sendMessage('FETCH_TREE', { repo: 'owner/repo' });
```

## Storage Schema

We use `chrome.storage.local` to persist user settings and cached diagrams.

```typescript
interface StorageSchema {
  settings: {
    githubToken: string;
    aiProvider: 'openai' | 'mistral' | 'anthropic';
    apiKeys: Record<string, string>;
  };
  cache: {
    [repoId: string]: {
      diagram: GraphNode[];
      timestamp: number;
    };
  };
}
```
