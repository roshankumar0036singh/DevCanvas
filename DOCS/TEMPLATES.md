# Creating Custom Diagram Templates

DevCanvas supports custom Mermaid templates for generating specific diagram types.

## Template Structure

Templates are defined in `src/utils/templates.ts`.

```typescript
export const myCustomTemplate = {
  id: 'my-diagram',
  label: 'My Custom Diagram',
  prompt: `
    Analyze the codebase and generate a Mermaid diagram...
    Use the following syntax...
  `,
  verification: (code: string) => {
    // Validate output
    return code.startsWith('graph TD');
  }
};
```

## Registering a Template

Add your template object to the `ALL_TEMPLATES` array in `src/utils/templates.ts`. It will automatically appear in the diagram type selector.
