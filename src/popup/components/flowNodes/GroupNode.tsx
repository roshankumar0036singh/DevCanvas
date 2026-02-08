import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

const GroupNode: React.FC<NodeProps> = ({ id, data, selected }) => {
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

    const borderColor = selected ? '#00DC82' : (data.strokeColor || '#94a3b8');

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                minWidth: data.minWidth || '200px',
                minHeight: data.minHeight || '150px',
                padding: 0,
                boxSizing: 'border-box',
                borderRadius: data.groupShape === 'rounded' ? '12px' : '4px',
                border: `${data.strokeWidth || 2}px ${data.strokeStyle || 'solid'} ${borderColor}`,
                background: data.color || 'rgba(0, 0, 0, 0)', // Use data.color or default transparent
                position: 'relative',
                transition: 'all 0.2s',
                pointerEvents: 'all'
            }}
        >
            <NodeResizer
                color={borderColor}
                isVisible={selected}
                minWidth={data.minWidth ? parseInt(data.minWidth) : 200}
                minHeight={data.minHeight ? parseInt(data.minHeight) : 150}
                handleStyle={{ width: 10, height: 10, borderRadius: '50%' }}
                lineStyle={{ border: 'none' }}
            />
            {/* Header / Label Area */}
            <div
                className="custom-drag-handle"
                style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '10px',
                    background: data.labelBgColor || 'var(--bg-primary)',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: data.textColor || '#cbd5e1',
                    borderRadius: '4px',
                    border: `1px solid ${borderColor}`,
                    cursor: 'grab',
                    zIndex: 10
                }}
            >
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
                            color: data.textColor || '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                            resize: 'none',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            overflow: 'hidden',
                            fontFamily: 'inherit',
                            minWidth: '50px'
                        }}
                    />
                ) : (
                    <span onClick={handleLabelClick}>{editLabel || id}</span>
                )}
            </div>

            {/* Hidden handles to allow connecting to the group itself if needed */}
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </div>
    );
};

export default GroupNode;
