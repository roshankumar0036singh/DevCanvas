import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const CylinderNode: React.FC<NodeProps> = ({ id, data, selected }) => {
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
        ? '#1e293b'
        : color;

    const borderColor = selected ? '#00DC82' : (data.strokeColor || '#0ea5e9');
    const shadow = selected
        ? '0 0 0 2px #00DC82, 0 8px 20px rgba(0, 220, 130, 0.2)'
        : '0 4px 6px rgba(0, 0, 0, 0.3)';

    const handleStyle = {
        width: '12px',
        height: '12px',
        background: data.handleColor || '#00DC82',
        border: '2px solid #0d1117',
        zIndex: 20,
        transition: 'all 0.2s'
    };

    // Calculate darker/lighter shades for 3D effect
    const topColor = adjustColorBrightness(background, 20);
    const sideColor = background;
    const strokeStyle = data.strokeStyle || 'solid';

    return (
        <div
            style={{
                position: 'relative',
                minWidth: '140px',
                maxWidth: '300px',
                width: 'auto',
                filter: `drop-shadow(${shadow})`,
                display: 'flex',
                flexDirection: 'column'
            }}
            onDoubleClick={handleLabelClick}
        >
            {/* Cylinder Top Cap */}
            <div style={{
                width: '100%',
                height: '24px',
                background: `radial-gradient(ellipse at center, ${adjustColorBrightness(topColor, 10)} 0%, ${topColor} 100%)`,
                borderRadius: '50%',
                border: `${data.strokeWidth || 2}px ${strokeStyle} ${borderColor}`,
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 10,
                boxSizing: 'border-box'
            }} />

            {/* Cylinder Body */}
            <div style={{
                marginTop: '12px', // Start at the midline of the top cap
                marginBottom: '12px', // End at the midline of the bottom cap
                background: `linear-gradient(to right, ${adjustColorBrightness(sideColor, -15)}, ${sideColor}, ${adjustColorBrightness(sideColor, -15)})`,
                borderLeft: `${data.strokeWidth || 2}px ${strokeStyle} ${borderColor}`,
                borderRight: `${data.strokeWidth || 2}px ${strokeStyle} ${borderColor}`,
                padding: '24px 12px 24px 12px',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center',
                position: 'relative',
                zIndex: 2, // Behind the caps
                boxSizing: 'border-box'
            }}>
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

            {/* Cylinder Bottom Cap */}
            <div style={{
                width: '100%',
                height: '24px',
                background: `linear-gradient(to right, ${adjustColorBrightness(sideColor, -15)}, ${sideColor}, ${adjustColorBrightness(sideColor, -15)})`,
                borderRadius: '50%',
                border: `${data.strokeWidth || 2}px ${strokeStyle} ${borderColor}`,
                position: 'absolute',
                bottom: 0,
                left: 0,
                zIndex: 5, // In front of the body's vertical borders
                boxSizing: 'border-box'
            }} />

            {/* Handles - Positioned predictably relative to the full height */}
            <Handle type="target" position={Position.Top} id="top-target" style={{ ...handleStyle, top: 4 }} />
            <Handle type="source" position={Position.Top} id="top-source" style={{ ...handleStyle, top: 4 }} />

            <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ ...handleStyle, bottom: 4 }} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ ...handleStyle, bottom: 4 }} />

            <Handle type="target" position={Position.Left} id="left-target" style={{ ...handleStyle, left: -6 }} />
            <Handle type="source" position={Position.Left} id="left-source" style={{ ...handleStyle, left: -6 }} />

            <Handle type="source" position={Position.Right} id="right-source" style={{ ...handleStyle, right: -6 }} />
            <Handle type="target" position={Position.Right} id="right-target" style={{ ...handleStyle, right: -6 }} />
        </div>
    );
};

function adjustColorBrightness(hex: string, percent: number) {
    if (!hex) return '#000';
    if (hex.startsWith('rgb')) return hex; // simplify
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

    // fix Negative
    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    return `#${(R.toString(16).padStart(2, '0'))}${(G.toString(16).padStart(2, '0'))}${(B.toString(16).padStart(2, '0'))}`;
}

export default CylinderNode;
