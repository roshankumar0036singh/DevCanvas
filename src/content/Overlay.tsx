import React, { useState, useEffect } from 'react';
import RagPanel from '../popup/components/RagPanel';
import { X, GripHorizontal } from 'lucide-react';

const Overlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 620 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    return (
        <div style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            width: '400px',
            height: '600px',
            backgroundColor: '#0f172a', // Dark background matching theme
            borderRadius: '24px', // Curved edges as requested
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Draggable Header */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    height: '40px',
                    background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
                    <GripHorizontal size={14} />
                    <span>DevCanvas</span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                        borderRadius: '50%'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content Area - Reusing RagPanel */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <RagPanel />
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Overlay;
