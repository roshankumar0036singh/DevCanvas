import React, { useCallback, useEffect, useState, KeyboardEvent } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    Node,
    Edge,
    Connection,
    addEdge,
    useNodesState,
    useEdgesState,
    MarkerType,
    EdgeLabelRenderer,
    BaseEdge,
    EdgeProps,
    getSmoothStepPath,
    BezierEdge,
    StraightEdge,
    StepEdge,
    SmoothStepEdge,
    SimpleBezierEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

// Type for edge label styles
interface LabelStyle {
    fill?: string;
    fontSize?: number;
    fontWeight?: number;
}

import RectangleNode from './flowNodes/RectangleNode';
import RoundedNode from './flowNodes/RoundedNode';
import CircleNode from './flowNodes/CircleNode';
import DiamondNode from './flowNodes/DiamondNode';
import CylinderNode from './flowNodes/CylinderNode';
import EntityNode from './flowNodes/EntityNode';
import GroupNode from './flowNodes/GroupNode';

const nodeTypes = {
    rectangle: RectangleNode,
    rounded: RoundedNode,
    circle: CircleNode,
    diamond: DiamondNode,
    cylinder: CylinderNode,
    entity: EntityNode,
    group: GroupNode,
};

// Custom Edge with editable label
const EditableEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    label,
    data,
    labelStyle,
    labelBgStyle,
    selected
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState((label as string) || (data?.label as string) || '');
    const [isHovered, setIsHovered] = useState(false);

    // Sync state with props
    useEffect(() => {
        setEditLabel(label as string || '');
    }, [label]);

    // Extract custom styles
    const customColor = (labelStyle as LabelStyle | undefined)?.fill;
    const customBg = (labelBgStyle as LabelStyle | undefined)?.fill;
    const customFontSize = (labelStyle as LabelStyle | undefined)?.fontSize;
    const customFontWeight = (labelStyle as LabelStyle | undefined)?.fontWeight;

    const handleLabelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditLabel(e.target.value);
    };

    const handleLabelBlur = () => {
        setIsEditing(false);
        if (data?.onLabelChange) {
            data.onLabelChange(id, editLabel);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLabelBlur();
        }
        if (e.key === 'Escape') {
            setEditLabel(label as string || '');
            setIsEditing(false);
        }
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    {isEditing ? (
                        <input
                            type="text"
                            value={editLabel}
                            onChange={handleLabelChange}
                            onBlur={handleLabelBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            style={{
                                background: customBg !== 'transparent' ? customBg : '#1c2128',
                                border: '1px solid #00DC82',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                color: customColor || '#fff',
                                fontSize: customFontSize ? `${customFontSize}px` : '12px',
                                fontWeight: customFontWeight || 600,
                                outline: 'none',
                                minWidth: '60px'
                            }}
                        />
                    ) : (
                        <div
                            className={!editLabel ? "edge-placeholder" : ""}
                            onClick={handleLabelClick}
                            style={{
                                // Hide placeholder unless hovered or selected to prevent clutter
                                opacity: !editLabel && !selected && !isHovered ? 0 : 1,
                                background: customBg !== 'transparent' ? customBg : '#1c2128',
                                border: '1px solid #30363d',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                color: customColor || '#ffffff',
                                fontSize: customFontSize ? `${customFontSize}px` : '12px',
                                fontWeight: customFontWeight || 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                setIsHovered(true);
                                e.currentTarget.style.borderColor = '#00DC82';
                                // Only change bg on hover if no custom bg is set
                                if (!customBg || customBg === 'transparent') {
                                    e.currentTarget.style.background = '#0d1117';
                                }
                            }}
                            onMouseLeave={(e) => {
                                setIsHovered(false);
                                e.currentTarget.style.borderColor = '#30363d';
                                // Reset bg on leave
                                e.currentTarget.style.background = (customBg && customBg !== 'transparent') ? customBg : '#1c2128';
                            }}
                        >
                            {editLabel || 'Click to edit'}
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer >
        </>
    );
};

const edgeTypes = {
    editable: EditableEdge,
    default: BezierEdge,
    straight: StraightEdge,
    step: StepEdge,
    smoothstep: SmoothStepEdge,
    simplebezier: SimpleBezierEdge
};

interface ReactFlowEditorProps {
    initialNodes: Node[];
    initialEdges: Edge[];
    onNodesChange: (nodes: Node[]) => void;
    onEdgesChange: (edges: Edge[]) => void;
    onNodeClick: (node: Node) => void;
    onEdgeClick: (edge: Edge) => void;
    onNodeDragStart?: (event: React.MouseEvent, node: Node) => void;
    onNodeDragStop?: (event: React.MouseEvent, node: Node) => void;
    backgroundColor?: string;
    backgroundVariant?: 'dots' | 'lines' | 'cross' | 'none';
    activeNodeId?: string | null;  // New prop for tour animation
}

const ReactFlowEditor: React.FC<ReactFlowEditorProps> = ({
    initialNodes,
    initialEdges,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    onEdgeClick,
    onNodeDragStart,
    onNodeDragStop,
    backgroundColor = '#0d1117',
    backgroundVariant = 'lines',
    activeNodeId = null
}) => {
    const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges);
    const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
    const [rfInstance, setRfInstance] = useState<any>(null); // Store RF instance


    const getVariant = () => {
        switch (backgroundVariant) {
            case 'lines': return BackgroundVariant.Lines;
            case 'cross': return BackgroundVariant.Cross;
            case 'dots': return BackgroundVariant.Dots;
            default: return BackgroundVariant.Dots;
        }
    };

    // Update when initial data changes
    useEffect(() => {
        setNodes(initialNodes);
    }, [initialNodes, setNodes]);

    const handleNodeLabelChange = useCallback((nodeId: string, newLabel: string) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, label: newLabel } }
                    : node
            )
        );
    }, [setNodes]);

    const handleEdgeLabelChange = useCallback((edgeId: string, newLabel: string) => {
        setEdges((eds) =>
            eds.map((edge) =>
                edge.id === edgeId
                    ? { ...edge, label: newLabel }
                    : edge
            )
        );
    }, [setEdges]);

    useEffect(() => {
        // Add editable type and label change handler to all nodes
        const editableNodes = initialNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                onLabelChange: handleNodeLabelChange
            }
        }));
        setNodes(editableNodes);
    }, [initialNodes, setNodes, handleNodeLabelChange]);

    useEffect(() => {
        // Add editable type and label change handler to all edges
        const editableEdges = initialEdges.map(edge => ({
            ...edge,
            type: 'editable',
            data: {
                ...edge.data,
                onLabelChange: handleEdgeLabelChange
            }
        }));
        setEdges(editableEdges);
    }, [initialEdges, setEdges, handleEdgeLabelChange]);

    // Sync changes back to parent (debounced to prevent flickering)
    useEffect(() => {
        const timer = setTimeout(() => {
            onNodesChange(nodes);
        }, 100);
        return () => clearTimeout(timer);
    }, [nodes, onNodesChange]);

    useEffect(() => {
        const timer = setTimeout(() => {
            onEdgesChange(edges);
        }, 100);
        return () => clearTimeout(timer);
    }, [edges, onEdgesChange]);



    const onConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return;

            const newEdge: Edge = {
                id: `${connection.source}-${connection.target}-${Date.now()}`,
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle,
                targetHandle: connection.targetHandle,
                type: 'editable',
                label: '',
                animated: false,
                style: { stroke: '#0ea5e9', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#0ea5e9',
                },
                data: {
                    onLabelChange: handleEdgeLabelChange
                }
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, handleEdgeLabelChange]
    );

    const handleEdgeClickInternal = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelectedEdge(edge.id);
        onEdgeClick(edge);
    }, [onEdgeClick]);

    // Handle keyboard delete
    useEffect(() => {
        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
                setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge));
                setSelectedEdge(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedEdge, setEdges]);

    // Tour Animation Effect
    useEffect(() => {
        if (activeNodeId && rfInstance) {
            const targetNode = nodes.find(n => n.id === activeNodeId);
            if (targetNode) {
                // Determine optimal zoom/position
                // We fit view to this specific node with some padding
                rfInstance.fitView({
                    nodes: [{ id: activeNodeId }],
                    padding: 1.2,
                    duration: 600,
                    minZoom: 0.5,
                    maxZoom: 1.5
                });

                // Optional: Highlight the node visually (handled in parent or via class mapping)
            }
        }
    }, [activeNodeId, rfInstance, nodes]);


    return (
        <div style={{
            width: '100%',
            height: '100%',
            minHeight: '500px',
            background: backgroundColor,
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onInit={setRfInstance}
                onNodeClick={(_, node) => onNodeClick(node)}
                onEdgeClick={handleEdgeClickInternal}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                attributionPosition="bottom-right"
                style={{ background: 'transparent' }}
                defaultEdgeOptions={{
                    type: 'editable',
                    animated: false,
                    style: { stroke: '#0ea5e9', strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#0ea5e9',
                    },
                }}
            >
                {backgroundVariant !== 'none' && (
                    <Background
                        color={backgroundColor === '#ffffff' || backgroundColor === '#fff' ? '#e2e8f0' : '#30363d'}
                        gap={20}
                        size={1}
                        variant={getVariant()}
                        style={{ background: backgroundColor }}
                    />
                )}
                <Controls
                    showInteractive={false}
                    style={{
                        background: '#1c2128',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                    }}
                />
            </ReactFlow>

            {/* Delete hint */}
            {selectedEdge && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1c2128',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#8b949e',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span>Press <span style={{ color: '#00DC82' }}>Delete</span> to remove arrow</span>
                    <button
                        onClick={() => {
                            setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge));
                            setSelectedEdge(null);
                        }}
                        style={{
                            background: '#EF4444',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReactFlowEditor;
