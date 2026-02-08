import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const DiamondNode: React.FC<NodeProps> = ({ id, data, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState(data.label || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync state with props
    useEffect(() => {
        setEditLabel(data.label || '');
    }, [data.label]);

    // Auto-resize textarea
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [editLabel, isEditing]);

    const handleLabelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleLabelBlur = () => {
        setIsEditing(false);
        if (data.onLabelChange) {
            data.onLabelChange(id, editLabel);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleLabelBlur();
        }
    };

    // Premium gradient look based on data.color or default
    const color = data.color || '#1e293b';
    const isDefaultColor = color === '#1e293b';

    const background = isDefaultColor
        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        : `linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -20)} 100%)`;

    const borderColor = selected ? '#00DC82' : (data.strokeColor || '#0ea5e9');
    const shadow = selected
        ? '0 0 20px rgba(0, 220, 130, 0.3), 0 4px 6px rgba(0,0,0,0.3)'
        : '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)';

    const handleStyle = {
        width: '12px',
        height: '12px',
        background: data.handleColor || '#00DC82',
        border: '2px solid #0d1117',
        zIndex: 10,
        transition: 'all 0.2s allow-discrete'
    };

    return (
        <div style={{
            position: 'relative',
            minWidth: '160px',
            minHeight: '160px',
            width: 'auto',
            height: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px' // Extra padding so diamond points don't clip
        }}
            onDoubleClick={handleLabelClick}
        >
            {/* The rotated diamond shape */}
            <div
                style={{
                    position: 'absolute',
                    width: '70%',
                    height: '70%',
                    transform: 'rotate(45deg)',
                    border: `${data.strokeWidth || 2}px ${data.strokeStyle || 'solid'} ${borderColor}`,
                    background: background,
                    boxShadow: shadow,
                    transition: 'all 0.3s ease',
                    borderRadius: '4px'
                }}
            />

            {/* Content (not rotated) */}
            <div
                style={{
                    position: 'relative',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: '120px',
                    zIndex: 1,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {data.imageUrl && (
                    <img
                        src={data.imageUrl}
                        alt=""
                        style={{
                            width: `${data.imageSize || 32}px`,
                            height: `${data.imageSize || 32}px`,
                            marginBottom: '4px',
                            objectFit: 'contain',
                            mixBlendMode: 'multiply'
                        }}
                    />
                )}
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={handleLabelBlur}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            width: '100%',
                            textAlign: 'center',
                            resize: 'none',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            overflow: 'hidden',
                            fontFamily: 'inherit'
                        }}
                    />
                ) : (
                    <div
                        onClick={handleLabelClick}
                        style={{
                            cursor: 'text',
                            width: '100%',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                        }}
                        dangerouslySetInnerHTML={{ __html: data.label }}
                    />
                )}
            </div>

            {/* Connecting Handles - 4 directions */}
            {/* Top: Target (Input) & Source */}
            <Handle
                type="target"
                position={Position.Top}
                id="top-target"
                style={{ ...handleStyle, top: '4px' }}
            />
            <Handle
                type="source"
                position={Position.Top}
                id="top-source"
                style={{ ...handleStyle, top: '4px' }}
            />

            {/* Bottom: Source (Output) & Target */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom-source"
                style={{ ...handleStyle, bottom: '4px' }}
            />
            <Handle
                type="target"
                position={Position.Bottom}
                id="bottom-target"
                style={{ ...handleStyle, bottom: '4px' }}
            />

            {/* Left: Source (Output - Decision No) & Target */}
            <Handle
                type="source"
                position={Position.Left}
                id="left-source"
                style={handleStyle}
            />
            <Handle
                type="target"
                position={Position.Left}
                id="left-target"
                style={handleStyle}
            />

            {/* Right: Source (Output - Decision Yes) & Target */}
            <Handle
                type="source"
                position={Position.Right}
                id="right-source"
                style={handleStyle}
            />
            <Handle
                type="target"
                position={Position.Right}
                id="right-target"
                style={handleStyle}
            />
        </div>
    );
};

// Helper to darken color for gradient
function adjustColorBrightness(hex: string, percent: number) {
    // Simple hex darken fn
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);
    R = Math.max(0, Math.min(255, R * (100 + percent) / 100));
    G = Math.max(0, Math.min(255, G * (100 + percent) / 100));
    B = Math.max(0, Math.min(255, B * (100 + percent) / 100));
    return `#${((1 << 24) + (Math.round(R) << 16) + (Math.round(G) << 8) + Math.round(B)).toString(16).slice(1)}`;
}

export default DiamondNode;
