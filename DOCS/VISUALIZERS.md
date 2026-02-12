# Developing Visualizers

Visualizers control how data is rendered on the canvas (e.g., Flowchart nodes vs. Class UML nodes).

## Node Types

We use **React Flow** for rendering. Custom nodes are registered in `DiagramRenderer.tsx`.

### Creating a Node

1.  Create a component in `src/popup/components/nodes/`.
2.  Wrap it with `memo` for performance.

```tsx
const MyNode = memo(({ data }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
```

3.  Register it in `nodeTypes` map in `DiagramRenderer.tsx`.
