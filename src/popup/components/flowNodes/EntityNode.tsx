import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface Attribute {
    type: string;
    name: string;
    constraint?: string; // PK, FK, etc.
}

const EntityNode: React.FC<NodeProps> = ({ id, data, selected }) => {
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

    const borderColor = selected ? '#00DC82' : (data.strokeColor || '#30363d');
    const headerColor = data.color || '#1e293b';

    const attributes: Attribute[] = data.attributes || [];

    const handleStyle = {
        width: '8px',
        height: '8px',
        background: '#00DC82',
        border: '1px solid #0d1117',
        zIndex: 20,
        opacity: 0.5
    };

    return (
        <div
            style={{
                background: '#0d1117',
                border: `${data.strokeWidth || 2}px solid ${borderColor}`,
                borderRadius: '6px',
                minWidth: '160px',
                maxWidth: '300px',
                width: 'auto',
                boxShadow: selected ? '0 0 0 2px #00DC82' : '0 4px 6px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                fontSize: '12px'
            }}
            onDoubleClick={handleLabelClick}
        >
            {/* Header */}
            <div style={{
                background: headerColor,
                padding: '8px 12px',
                borderBottom: `1px solid ${borderColor}`,
                fontWeight: 700,
                color: '#fff',
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
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
                            fontSize: '12px',
                            fontWeight: 700,
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

            {/* Attributes Body */}
            <div style={{ padding: '4px 0' }}>
                {attributes.length > 0 ? (
                    attributes.map((attr, i) => (
                        <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(40px, auto) 1fr 30px',
                            gap: '8px',
                            padding: '4px 12px',
                            borderBottom: i < attributes.length - 1 ? '1px solid #21262d' : 'none',
                            color: '#c9d1d9',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: '#79c0ff', fontFamily: 'monospace' }}>{attr.type}</span>
                            <span style={{ fontWeight: 500 }}>{attr.name}</span>
                            <span style={{
                                fontSize: '10px',
                                color: attr.constraint === 'PK' ? '#e3b341' : attr.constraint === 'FK' ? '#d2a8ff' : '#8b949e',
                                fontWeight: 700
                            }}>
                                {attr.constraint}
                            </span>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '8px 12px', color: '#8b949e', fontStyle: 'italic' }}>
                        No fields
                    </div>
                )}
            </div>

            {/* Connection Handles - Distributed around */}
            <Handle type="target" position={Position.Top} id="top" style={{ ...handleStyle, top: -4 }} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleStyle, bottom: -4 }} />
            <Handle type="target" position={Position.Left} id="left" style={{ ...handleStyle, left: -4 }} />
            <Handle type="source" position={Position.Right} id="right" style={{ ...handleStyle, right: -4 }} />
        </div>
    );
};

export default EntityNode;
