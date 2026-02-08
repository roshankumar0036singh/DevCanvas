import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const RectangleNode: React.FC<NodeProps> = ({ id, data, selected }) => {
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

    // Premium styling logic
    const color = data.color || '#1e293b';
    const isDefaultColor = color === '#1e293b';

    const background = isDefaultColor
        ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
        : `linear-gradient(180deg, ${color} 0%, ${adjustColorBrightness(color, -20)} 100%)`;

    const borderColor = selected ? '#00DC82' : (data.strokeColor || '#0ea5e9');
    const shadow = selected
        ? '0 0 0 2px #00DC82, 0 8px 20px rgba(0, 220, 130, 0.2)'
        : '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)';

    const handleStyle = {
        width: '12px',
        height: '12px',
        background: data.handleColor || '#00DC82',
        border: '2px solid #0d1117',
        zIndex: 10,
        transition: 'all 0.2s allow-discrete'
    };

    return (
        <div
            style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: `${data.strokeWidth || 2}px ${data.strokeStyle || 'solid'} ${borderColor}`,
                background: background,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                minWidth: '140px',
                maxWidth: '300px',
                width: 'auto',
                textAlign: 'center',
                boxShadow: shadow,
                cursor: 'move',
                transition: 'all 0.2s',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}
            onDoubleClick={handleLabelClick}
        >
            {/* Top Handles */}
            <Handle type="target" position={Position.Top} id="top-target" style={handleStyle} />
            <Handle type="source" position={Position.Top} id="top-source" style={handleStyle} />
            <Handle type="source" position={Position.Bottom} id="bottom-source" style={handleStyle} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={handleStyle} />
            <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />
            <Handle type="target" position={Position.Right} id="right-target" style={handleStyle} />
            <Handle type="source" position={Position.Left} id="left-source" style={handleStyle} />
            <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />

            {/* Label - Safe HTML rendering or Input */}
            {data.imageUrl && (
                <img
                    src={data.imageUrl}
                    alt=""
                    style={{
                        width: `${data.imageSize || 40}px`,
                        height: `${data.imageSize || 40}px`,
                        marginBottom: '8px',
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

            {/* Bottom Handles */}
            <Handle type="source" position={Position.Bottom} id="bottom-source" style={handleStyle} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={handleStyle} />

            {/* Left Handles */}
            <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />
            <Handle type="source" position={Position.Left} id="left-source" style={handleStyle} />

            {/* Right Handles */}
            <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />
            <Handle type="target" position={Position.Right} id="right-target" style={handleStyle} />
        </div>
    );
};

function adjustColorBrightness(hex: string, percent: number) {
    if (!hex) return '#000';
    if (hex.startsWith('rgb')) return hex;
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];

    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.round(R * (100 + percent) / 100);
    G = Math.round(G * (100 + percent) / 100);
    B = Math.round(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    return `#${(R.toString(16).padStart(2, '0'))}${(G.toString(16).padStart(2, '0'))}${(B.toString(16).padStart(2, '0'))}`;
}

export default RectangleNode;
