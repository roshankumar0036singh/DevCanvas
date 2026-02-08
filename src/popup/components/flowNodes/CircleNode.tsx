import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const CircleNode: React.FC<NodeProps> = ({ id, data, selected }) => {
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

    const color = data.color || '#1e293b';
    const isDefaultColor = color === '#1e293b';
    const background = isDefaultColor
        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        : `linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -20)} 100%)`;

    const borderColor = selected ? '#00DC82' : (data.strokeColor || '#0ea5e9');
    const shadow = selected
        ? '0 0 0 2px #00DC82, 0 8px 20px rgba(0, 220, 130, 0.2)'
        : '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)';

    const handleStyle = {
        width: '12px',
        height: '12px',
        background: data.handleColor || '#00DC82',
        border: '2px solid #0d1117',
        zIndex: 10
    };

    return (
        <div
            style={{
                minWidth: data.isAnchor ? '12px' : (data.minWidth || '80px'),
                minHeight: data.isAnchor ? '12px' : (data.minHeight || '80px'),
                width: data.isAnchor ? '12px' : 'auto',
                height: data.isAnchor ? '12px' : 'auto',
                padding: data.isAnchor ? '0' : '16px',
                borderRadius: '50%',
                border: data.isAnchor ? 'none' : `${data.strokeWidth || 2}px ${data.strokeStyle || 'solid'} ${borderColor}`,
                background: background,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxShadow: data.isAnchor ? 'none' : shadow,
                cursor: 'move',
                transition: 'all 0.2s',
                position: 'relative'
            }}
            onDoubleClick={handleLabelClick}
        >
            <Handle type="target" position={Position.Top} id="top-target" style={{ ...handleStyle, top: '4px' }} />
            <Handle type="source" position={Position.Top} id="top-source" style={{ ...handleStyle, top: '4px' }} />
            <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ ...handleStyle, bottom: '4px', top: 'auto' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ ...handleStyle, bottom: '4px', top: 'auto' }} />
            <Handle type="source" position={Position.Right} id="right-source" style={{ ...handleStyle, right: '4px', left: 'auto' }} />
            <Handle type="target" position={Position.Right} id="right-target" style={{ ...handleStyle, right: '4px', left: 'auto' }} />
            <Handle type="source" position={Position.Left} id="left-source" style={{ ...handleStyle, left: '4px', right: 'auto' }} />
            <Handle type="target" position={Position.Left} id="left-target" style={{ ...handleStyle, left: '4px', right: 'auto' }} />

            {/* Label - Safe HTML rendering or Input */}
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
                        whiteSpace: 'pre-wrap',
                        padding: '16px'
                    }}
                    dangerouslySetInnerHTML={{ __html: data.label }}
                />
            )}

            <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ ...handleStyle, bottom: '4px' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ ...handleStyle, bottom: '4px' }} />

            <Handle type="target" position={Position.Left} id="left-target" style={{ ...handleStyle, left: '4px' }} />
            <Handle type="source" position={Position.Left} id="left-source" style={{ ...handleStyle, left: '4px' }} />

            <Handle type="source" position={Position.Right} id="right-source" style={{ ...handleStyle, right: '4px' }} />
            <Handle type="target" position={Position.Right} id="right-target" style={{ ...handleStyle, right: '4px' }} />
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
    R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
    return `#${(R.toString(16).padStart(2, '0'))}${(G.toString(16).padStart(2, '0'))}${(B.toString(16).padStart(2, '0'))}`;
}

export default CircleNode;
