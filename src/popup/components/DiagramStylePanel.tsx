import React, { useState, useEffect, useRef } from 'react';
import { Type, Square, Circle, Settings2, X, ArrowRight, Layers, Sparkles } from 'lucide-react';
import { Edge } from 'reactflow';

interface DiagramStylePanelProps {
    selectedNode: {
        id: string;
        text: string;
        shape?: string;
        color?: string;
        strokeColor?: string;
        strokeStyle?: string;
        handleColor?: string;
        textColor?: string;
        imageUrl?: string;
        imageSize?: number;
        strokeWidth?: number;
        groupShape?: string;
        labelBgColor?: string;
        parentNode?: string;
    } | null;

    selectedEdge?: Edge | null;
    onNodeUpdate: (nodeId: string, updates: {
        text?: string;
        shape?: string;
        color?: string;
        strokeColor?: string;
        strokeStyle?: string;
        handleColor?: string;
        textColor?: string;
        imageUrl?: string;
        imageSize?: number;
        strokeWidth?: number;
        groupShape?: string;
        labelBgColor?: string;
    }) => void;
    onEdgeUpdate?: (edgeId: string, updates: {
        label?: string;
        color?: string;
        style?: string;
        labelColor?: string;
        labelBg?: string;
    }) => void;
    onArrowCreate?: (from: string, to: string, label: string, style: string, color?: string) => void;
    onBackgroundChange?: (color: string, pattern: 'dots' | 'lines' | 'cross' | 'none') => void;
    currentBackground?: { color: string; pattern: 'dots' | 'lines' | 'cross' | 'none' };
    availableNodes?: string[]; // List of all node IDs in the diagram
    onFolderAudit?: (folderName: string) => void;
    onDelete?: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

const SHAPES = [
    { id: 'rect', label: 'Rectangle', icon: <div style={{ width: '18px', height: '12px', border: '2px solid currentColor', borderRadius: '2px' }} /> },
    { id: 'rounded', label: 'Rounded', icon: <Square size={16} style={{ borderRadius: '6px' }} /> },
    { id: 'circle', label: 'Circle', icon: <Circle size={16} /> },
    { id: 'diamond', label: 'Diamond', icon: <div style={{ transform: 'rotate(45deg)', width: '12px', height: '12px', border: '2px solid currentColor' }} /> },
];

const ensureFullHex = (color: string) => {
    if (!color) return '#000000';
    if (color === 'transparent') return '#ffffff';
    if (color.startsWith('#')) {
        if (color.length === 4) {
            return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        return color.slice(0, 7);
    }
    if (color.startsWith('rgb')) {
        const parts = color.match(/\d+(\.\d+)?/g);
        if (parts && parts.length >= 3) {
            const r = parseInt(parts[0]).toString(16).padStart(2, '0');
            const g = parseInt(parts[1]).toString(16).padStart(2, '0');
            const b = parseInt(parts[2]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
    }
    return '#000000';
};


const PRESET_COLORS = [
    { name: 'Default', value: '#1e293b' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Green', value: '#10B981' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Pink', value: '#EC4899' },
];

const ARROW_STYLES = [
    { id: 'solid', label: 'Solid Arrow', symbol: '-->' },
    { id: 'dotted', label: 'Dotted Arrow', symbol: '-.->' },
    { id: 'thick', label: 'Thick Arrow', symbol: '==>' },
    { id: 'open', label: 'Open Arrow', symbol: '---' },
];

const DiagramStylePanel: React.FC<DiagramStylePanelProps> = ({
    selectedNode,
    selectedEdge,
    onNodeUpdate,
    onEdgeUpdate,
    onArrowCreate,
    onBackgroundChange,
    currentBackground = { color: '#0d1117', pattern: 'dots' },
    availableNodes = [],
    onFolderAudit,
    onDelete,

    isOpen,
    onToggle
}) => {
    const [activeTab, setActiveTab] = useState<'node' | 'arrow' | 'overlay'>('node');

    // Node properties
    const [text, setText] = useState('');
    const [selectedShape, setSelectedShape] = useState('rect');
    const [fillColor, setFillColor] = useState('#1e293b');
    const [strokeColor, setStrokeColor] = useState('#0ea5e9');
    const [strokeStyle, setStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
    const [handleColor, setHandleColor] = useState('#00DC82');
    const [textColor, setTextColor] = useState('#ffffff');
    const [imageUrl, setImageUrl] = useState('');
    const [imageSize, setImageSize] = useState(40);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [groupShape, setGroupShape] = useState('rectangle');
    const [labelBgColor, setLabelBgColor] = useState('transparent');

    // Arrow properties
    const [arrowFrom, setArrowFrom] = useState('');
    const [arrowTo, setArrowTo] = useState('');
    const [arrowLabel, setArrowLabel] = useState('');
    const [arrowStyle, setArrowStyle] = useState('solid');
    const [arrowColor, setArrowColor] = useState('#0ea5e9');


    // Edge properties (for editing existing edges)
    const [edgeLabel, setEdgeLabel] = useState('');
    const [edgeColor, setEdgeColor] = useState('#0ea5e9');
    const [edgeLabelColor, setEdgeLabelColor] = useState('#ffffff');
    const [edgeLabelBg, setEdgeLabelBg] = useState('transparent');

    // Background properties
    const [bgColor, setBgColor] = useState(currentBackground.color);
    const [bgPattern, setBgPattern] = useState(currentBackground.pattern);

    // Sync local state when props change
    useEffect(() => {
        setBgColor(currentBackground.color);
        setBgPattern(currentBackground.pattern);
    }, [currentBackground.color, currentBackground.pattern]);

    const handleBgChange = (color: string, pattern: any) => {
        setBgColor(color);
        setBgPattern(pattern);
        if (onBackgroundChange) {
            onBackgroundChange(color, pattern);
        }
    };



    // Reset when node selection changes
    useEffect(() => {
        if (selectedNode) {
            setText(selectedNode.text);
            setSelectedShape(selectedNode.shape || 'rect');
            setFillColor(selectedNode.color || '#1e293b');
            setStrokeColor(selectedNode.strokeColor || '#0ea5e9');
            setStrokeStyle((selectedNode.strokeStyle as any) || 'solid');
            setHandleColor(selectedNode.handleColor || '#00DC82');
            setTextColor(selectedNode.textColor || '#ffffff');
            setImageUrl(selectedNode.imageUrl || '');
            setImageSize(selectedNode.imageSize || 40);
            setStrokeWidth(selectedNode.strokeWidth || 2);
            setGroupShape(selectedNode.groupShape || 'rectangle');
            setLabelBgColor(selectedNode.labelBgColor || 'transparent');


            // Pre-fill arrow "from" with selected node
            setArrowFrom(selectedNode.id);
        }
    }, [selectedNode?.id, selectedNode?.parentNode]);

    // Reset when edge selection changes
    useEffect(() => {
        if (selectedEdge) {
            setEdgeLabel((selectedEdge.label as string) || '');
            setEdgeColor((selectedEdge.style as any)?.stroke || '#0ea5e9');
            setEdgeLabelColor((selectedEdge as any).labelStyle?.fill || '#ffffff');
            setEdgeLabelBg((selectedEdge as any).labelBgStyle?.fill || 'transparent');
        }
    }, [selectedEdge?.id]);

    const nodeTextRef = useRef<HTMLTextAreaElement>(null);
    const edgeLabelRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textareas
    useEffect(() => {
        if (nodeTextRef.current) {
            nodeTextRef.current.style.height = 'auto';
            nodeTextRef.current.style.height = `${nodeTextRef.current.scrollHeight}px`;
        }
    }, [text, activeTab]);

    useEffect(() => {
        if (edgeLabelRef.current) {
            edgeLabelRef.current.style.height = 'auto';
            edgeLabelRef.current.style.height = `${edgeLabelRef.current.scrollHeight}px`;
        }
    }, [edgeLabel, activeTab]);


    const applyNodeChanges = () => {
        if (!selectedNode) return;

        onNodeUpdate(selectedNode.id, {
            text,
            shape: selectedShape,
            color: fillColor,
            strokeColor: strokeColor,
            strokeStyle: strokeStyle,
            handleColor: handleColor,
            textColor: textColor,
            imageUrl: imageUrl,
            imageSize: imageSize,
            strokeWidth: strokeWidth
        });
    };

    const createArrow = () => {
        if (!arrowFrom || !arrowTo) {
            alert('Please select both source and target nodes');
            return;
        }

        if (onArrowCreate) {
            onArrowCreate(arrowFrom, arrowTo, arrowLabel, arrowStyle, arrowColor);
        }

        // Reset arrow form
        setArrowLabel('');
        setArrowTo('');
    };

    const applyEdgeChanges = () => {
        if (!selectedEdge || !onEdgeUpdate) return;

        onEdgeUpdate(selectedEdge.id, {
            label: edgeLabel,
            color: edgeColor,
            labelColor: edgeLabelColor,
            labelBg: edgeLabelBg,
        });
    };

    return (
        <div className="diagram-style-panel" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <button
                className="style-toggle-btn btn-secondary"
                onClick={onToggle}
                title="Toggle Style Panel"
                style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}
            >
                <Settings2 size={18} />
                <span>Styles</span>
            </button>

            {isOpen && (
                <div className="style-panel-content" style={{
                    position: 'absolute',
                    top: '42px',
                    right: 0,
                    width: '340px',
                    maxHeight: '650px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    background: '#0d1117',
                    border: '1px solid #ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                    {!selectedNode && !selectedEdge ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Settings2 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p style={{ fontSize: '14px', margin: 0 }}>Select a node or edge to edit styles</p>
                            <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>Or use the Arrow tab to create connections</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{
                                padding: '16px',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-tertiary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Settings2 size={16} style={{ color: 'var(--brand-solid)' }} />
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Editing</div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {selectedNode ? selectedNode.id : selectedEdge ? 'Edge' : ''}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onToggle}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="style-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                                <button
                                    className={`style-tab ${activeTab === 'node' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('node')}
                                    style={{ flex: 1 }}
                                >
                                    <Square size={16} />
                                    <span>Node</span>
                                </button>
                                <button
                                    className={`style-tab ${activeTab === 'arrow' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('arrow')}
                                    style={{ flex: 1 }}
                                >
                                    <ArrowRight size={16} />
                                    <span>Arrow</span>
                                </button>
                                <button
                                    className={`style-tab ${activeTab === 'overlay' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('overlay')}
                                    style={{ flex: 1 }}
                                >
                                    <Layers size={16} />
                                    <span>Overlay</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="style-content" style={{ padding: '16px' }}>
                                {activeTab === 'node' && (
                                    <div className="style-section">
                                        {selectedEdge ? (
                                            <>
                                                {/* Edge Label Input */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                        <Type size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                                        Edge Label
                                                    </label>
                                                    <textarea
                                                        ref={edgeLabelRef}
                                                        value={edgeLabel}
                                                        onChange={(e) => setEdgeLabel(e.target.value)}
                                                        placeholder="Enter edge label"
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '14px',
                                                            resize: 'none',
                                                            minHeight: '40px',
                                                            overflow: 'hidden',
                                                            fontFamily: 'inherit'
                                                        }}
                                                    />
                                                </div>

                                                {/* Edge Color */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Edge Color</label>
                                                    <div className="color-input-group">
                                                        <input
                                                            type="color"
                                                            value={ensureFullHex(edgeColor)}
                                                            onChange={(e) => setEdgeColor(e.target.value)}
                                                            style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={edgeColor}
                                                            onChange={(e) => setEdgeColor(e.target.value)}
                                                            placeholder="#0ea5e9"
                                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Label Text Color */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Label Text Color</label>
                                                    <div className="color-input-group">
                                                        <input
                                                            type="color"
                                                            value={ensureFullHex(edgeLabelColor)}
                                                            onChange={(e) => setEdgeLabelColor(e.target.value)}
                                                            style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={edgeLabelColor}
                                                            onChange={(e) => setEdgeLabelColor(e.target.value)}
                                                            placeholder="#ffffff"
                                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Label Background Color */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Label Background</label>
                                                    <div className="color-input-group">
                                                        <input
                                                            type="color"
                                                            value={ensureFullHex(edgeLabelBg === 'transparent' ? '#000000' : edgeLabelBg)}
                                                            onChange={(e) => setEdgeLabelBg(e.target.value)}
                                                            style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={edgeLabelBg}
                                                            onChange={(e) => setEdgeLabelBg(e.target.value)}
                                                            placeholder="transparent"
                                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn-primary"
                                                    onClick={applyEdgeChanges}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        borderRadius: '8px',
                                                        background: 'var(--brand-solid)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Apply Edge Changes
                                                </button>
                                            </>
                                        ) : selectedNode ? (
                                            <>
                                                {/* Text Input */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                        <Type size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                                        Node Text
                                                    </label>
                                                    <textarea
                                                        ref={nodeTextRef}
                                                        value={text}
                                                        onChange={(e) => setText(e.target.value)}
                                                        placeholder="Enter node text"
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '14px',
                                                            resize: 'none',
                                                            minHeight: '40px',
                                                            overflow: 'hidden',
                                                            fontFamily: 'inherit'
                                                        }}
                                                    />
                                                </div>

                                                {/* Shape Selection */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Shape</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                                        {SHAPES.map(shape => (
                                                            <button
                                                                key={shape.id}
                                                                onClick={() => setSelectedShape(shape.id)}
                                                                style={{
                                                                    padding: '14px',
                                                                    border: `2px solid ${selectedShape === shape.id ? 'var(--brand-solid)' : 'var(--border)'}`,
                                                                    borderRadius: '8px',
                                                                    background: selectedShape === shape.id ? 'var(--brand-subtle)' : 'var(--bg-secondary)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    justifyContent: 'center',
                                                                    alignItems: 'center',
                                                                    color: selectedShape === shape.id ? 'var(--brand-solid)' : 'var(--text-secondary)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                title={shape.label}
                                                            >
                                                                {shape.icon}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Fill Color */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Fill Color</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                                                        {PRESET_COLORS.map(color => (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => setFillColor(color.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '36px',
                                                                    borderRadius: '6px',
                                                                    border: `2px solid ${fillColor === color.value ? '#fff' : 'transparent'}`,
                                                                    background: color.value,
                                                                    cursor: 'pointer',
                                                                    boxShadow: fillColor === color.value ? '0 0 0 2px var(--brand-solid)' : 'none'
                                                                }}
                                                                title={color.name}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="color-input-group">
                                                        <input
                                                            type="color"
                                                            value={ensureFullHex(fillColor)}
                                                            onChange={(e) => setFillColor(e.target.value)}
                                                            style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={fillColor}
                                                            onChange={(e) => setFillColor(e.target.value)}
                                                            placeholder="#1e293b"
                                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Stroke */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Stroke Style</label>
                                                    <select
                                                        value={strokeStyle}
                                                        onChange={(e) => setStrokeStyle(e.target.value as any)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '14px',
                                                            marginBottom: '8px'
                                                        }}
                                                    >
                                                        <option value="solid">Solid Line</option>
                                                        <option value="dashed">Dashed Line</option>
                                                        <option value="dotted">Dotted Line</option>
                                                    </select>

                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Stroke Color</label>
                                                    <div className="color-input-group">
                                                        <input
                                                            type="color"
                                                            value={ensureFullHex(strokeColor)}
                                                            onChange={(e) => setStrokeColor(e.target.value)}
                                                            style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={strokeColor}
                                                            onChange={(e) => setStrokeColor(e.target.value)}
                                                            placeholder="#0ea5e9"
                                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Handle Color */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Handle Color</label>
                                                    <div className="color-input-group">
                                                        <input
                                                            type="color"
                                                            value={ensureFullHex(handleColor)}
                                                            onChange={(e) => setHandleColor(e.target.value)}
                                                            style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={handleColor}
                                                            onChange={(e) => setHandleColor(e.target.value)}
                                                            placeholder="#00DC82"
                                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Text Color */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Text Color</label>
                                                    <div className="color-input-group">
                                                        <input
                                                            type="color"
                                                            value={ensureFullHex(textColor)}
                                                            onChange={(e) => setTextColor(e.target.value)}
                                                            style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={textColor}
                                                            onChange={(e) => setTextColor(e.target.value)}
                                                            placeholder="#ffffff"
                                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Stroke Width Slider */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Stroke Width</label>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{strokeWidth}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="10"
                                                        step="1"
                                                        value={strokeWidth}
                                                        onChange={(e) => {
                                                            const w = parseInt(e.target.value);
                                                            setStrokeWidth(w);
                                                            if (selectedNode) onNodeUpdate(selectedNode.id, { strokeWidth: w });
                                                        }}
                                                        style={{ width: '100%', accentColor: 'var(--brand-solid)' }}
                                                    />
                                                </div>

                                                {/* Group Specific Controls */}
                                                {selectedNode && selectedNode.id.startsWith('group') && (
                                                    <>
                                                        <div className="style-group" style={{ marginBottom: '20px' }}>
                                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Group Shape</label>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setGroupShape('rectangle');
                                                                        onNodeUpdate(selectedNode.id, { groupShape: 'rectangle' });
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '8px',
                                                                        border: groupShape === 'rectangle' ? '1px solid var(--brand-solid)' : '1px solid var(--border)',
                                                                        borderRadius: '6px',
                                                                        background: groupShape === 'rectangle' ? 'rgba(0, 220, 130, 0.1)' : 'transparent',
                                                                        color: groupShape === 'rectangle' ? 'var(--brand-solid)' : 'var(--text-secondary)',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Rectangle
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setGroupShape('rounded');
                                                                        onNodeUpdate(selectedNode.id, { groupShape: 'rounded' });
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '8px',
                                                                        border: groupShape === 'rounded' ? '1px solid var(--brand-solid)' : '1px solid var(--border)',
                                                                        borderRadius: '6px',
                                                                        background: groupShape === 'rounded' ? 'rgba(0, 220, 130, 0.1)' : 'transparent',
                                                                        color: groupShape === 'rounded' ? 'var(--brand-solid)' : 'var(--text-secondary)',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Rounded
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="style-group" style={{ marginBottom: '20px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Label Background</label>
                                                            </div>
                                                            <div className="color-input-group" style={{ display: 'flex', gap: '8px' }}>
                                                                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                                                    <input
                                                                        type="color"
                                                                        value={ensureFullHex(labelBgColor === 'transparent' ? '#ffffff' : labelBgColor)}
                                                                        onChange={(e) => {
                                                                            const newVal = e.target.value;
                                                                            setLabelBgColor(newVal);
                                                                            // Debounce the update to parent to prevent history spam / render crash
                                                                            if ((window as any).colorTimeout) clearTimeout((window as any).colorTimeout);
                                                                            (window as any).colorTimeout = setTimeout(() => {
                                                                                onNodeUpdate(selectedNode.id, { labelBgColor: newVal });
                                                                            }, 200);
                                                                        }}
                                                                        style={{
                                                                            width: '40px',
                                                                            height: '40px',
                                                                            border: 'none',
                                                                            borderRadius: '6px',
                                                                            cursor: 'pointer',
                                                                            padding: 0,
                                                                            background: 'none'
                                                                        }}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={labelBgColor}
                                                                        onChange={(e) => {
                                                                            setLabelBgColor(e.target.value);
                                                                            onNodeUpdate(selectedNode.id, { labelBgColor: e.target.value });
                                                                        }}
                                                                        style={{
                                                                            flex: 1,
                                                                            marginLeft: '8px',
                                                                            padding: '8px 12px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid var(--border)',
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-primary)',
                                                                            fontSize: '13px'
                                                                        }}
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setLabelBgColor('transparent');
                                                                        onNodeUpdate(selectedNode.id, { labelBgColor: 'transparent' });
                                                                    }}
                                                                    title="Clear Background"
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        background: 'transparent',
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: '6px',
                                                                        color: 'var(--text-secondary)',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.color = '#fff';
                                                                        e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                                    }}
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Image URL */}
                                                <div className="style-group" style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Image URL</label>
                                                    <input
                                                        type="text"
                                                        value={imageUrl}
                                                        onChange={(e) => setImageUrl(e.target.value)}
                                                        placeholder="https://example.com/image.png"
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                </div>

                                                {/* Image Size Slider */}
                                                {imageUrl && (
                                                    <div className="style-group" style={{ marginBottom: '20px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Image Size</label>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{imageSize}px</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="20"
                                                            max="200"
                                                            step="5"
                                                            value={imageSize}
                                                            onChange={(e) => {
                                                                const s = parseInt(e.target.value);
                                                                setImageSize(s);
                                                                if (selectedNode) onNodeUpdate(selectedNode.id, { imageSize: s });
                                                            }}
                                                            style={{ width: '100%', accentColor: 'var(--brand-solid)' }}
                                                        />
                                                    </div>
                                                )}

                                                <button
                                                    className="btn-primary"
                                                    onClick={applyNodeChanges}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        borderRadius: '8px',
                                                        background: 'var(--brand-solid)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Apply Node Changes
                                                </button>

                                                {onFolderAudit && selectedNode && (
                                                    <div className="style-group" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                                        <button
                                                            className="btn-primary"
                                                            onClick={() => onFolderAudit(selectedNode.text)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px',
                                                                fontSize: '14px',
                                                                fontWeight: 600,
                                                                borderRadius: '8px',
                                                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '8px',
                                                                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                                                            }}
                                                        >
                                                            <Sparkles size={16} />
                                                            Audit Component
                                                        </button>
                                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
                                                            Get a targeted 5-issue report for this component.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Delete Button */}
                                                <div className="style-group" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                                    <button
                                                        onClick={onDelete}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: '#EF4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                    >
                                                        <X size={14} />
                                                        Delete {selectedNode ? 'Node' : 'Edge'}
                                                    </button>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                )}

                                {activeTab === 'arrow' && (
                                    <div className="style-section">
                                        {/* Arrow Connection */}
                                        <div style={{
                                            background: 'var(--bg-tertiary)',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            marginBottom: '20px',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                                Arrow Connection
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <select
                                                    value={arrowFrom}
                                                    onChange={(e) => setArrowFrom(e.target.value)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    <option value="">From...</option>
                                                    {availableNodes.map(node => (
                                                        <option key={node} value={node}>{node}</option>
                                                    ))}
                                                </select>

                                                <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />

                                                <select
                                                    value={arrowTo}
                                                    onChange={(e) => setArrowTo(e.target.value)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    <option value="">To...</option>
                                                    {availableNodes.filter(n => n !== arrowFrom).map(node => (
                                                        <option key={node} value={node}>{node}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Arrow Label */}
                                        <div className="style-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                <Type size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                                Arrow Label
                                            </label>
                                            <input
                                                type="text"
                                                value={arrowLabel}
                                                onChange={(e) => setArrowLabel(e.target.value)}
                                                placeholder="e.g., Yes, No, Success"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>

                                        {/* Arrow Style */}
                                        <div className="style-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Arrow Style</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                {ARROW_STYLES.map(style => (
                                                    <button
                                                        key={style.id}
                                                        onClick={() => setArrowStyle(style.id)}
                                                        style={{
                                                            padding: '10px',
                                                            border: `2px solid ${arrowStyle === style.id ? 'var(--brand-solid)' : 'var(--border)'}`,
                                                            borderRadius: '6px',
                                                            background: arrowStyle === style.id ? 'var(--brand-subtle)' : 'var(--bg-secondary)',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            color: arrowStyle === style.id ? 'var(--brand-solid)' : 'var(--text-secondary)',
                                                            fontFamily: 'monospace'
                                                        }}
                                                    >
                                                        {style.symbol}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>                                        {/* Arrow Label Color */}
                                        <div className="style-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Label Color</label>
                                            <div className="color-input-group">
                                                <input
                                                    type="color"
                                                    value={ensureFullHex(arrowColor)}
                                                    onChange={(e) => setArrowColor(e.target.value)}
                                                    style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={arrowColor}
                                                    onChange={(e) => setArrowColor(e.target.value)}
                                                    placeholder="#0ea5e9"
                                                    style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                        </div>


                                        {/* Quick Presets */}
                                        <div className="style-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Quick Presets</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <button onClick={() => setArrowLabel('Yes')} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#10B981', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                                                    Yes
                                                </button>
                                                <button onClick={() => setArrowLabel('No')} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                                                    No
                                                </button>
                                                <button onClick={() => setArrowLabel('Success')} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#10B981', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                                                    Success
                                                </button>
                                                <button onClick={() => setArrowLabel('Error')} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                                                    Error
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            className="btn-primary"
                                            onClick={createArrow}

                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                borderRadius: '8px',
                                                background: (!arrowFrom || !arrowTo) ? '#4a5568' : '#00DC82',
                                                color: '#ffffff',
                                                border: 'none',
                                                cursor: (!arrowFrom || !arrowTo) ? 'not-allowed' : 'pointer',
                                                opacity: (!arrowFrom || !arrowTo) ? 0.6 : 1,
                                                pointerEvents: (!arrowFrom || !arrowTo) ? 'none' : 'auto'
                                            }}
                                        >
                                            Create Arrow
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'overlay' && (
                                    <div className="style-section">
                                        {/* Background Color */}
                                        <div className="style-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Canvas Background</label>
                                            <div className="color-input-group" style={{ marginBottom: '12px' }}>
                                                <input
                                                    type="color"
                                                    value={ensureFullHex(bgColor)}
                                                    onChange={(e) => handleBgChange(e.target.value, bgPattern)}
                                                    style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={bgColor}
                                                    onChange={(e) => handleBgChange(e.target.value, bgPattern)}
                                                    placeholder="#0d1117"
                                                    style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                />
                                            </div>

                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pattern</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                {['dots', 'lines', 'cross', 'none'].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => handleBgChange(bgColor, p)}
                                                        style={{
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: `2px solid ${bgPattern === p ? 'var(--brand-solid)' : 'var(--border)'}`,
                                                            background: bgPattern === p ? 'var(--brand-subtle)' : 'var(--bg-secondary)',
                                                            color: bgPattern === p ? 'var(--brand-solid)' : 'var(--text-secondary)',
                                                            fontSize: '13px',
                                                            textTransform: 'capitalize',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )
            }
        </div >
    );
};

export default DiagramStylePanel;


