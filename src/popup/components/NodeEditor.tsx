import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Square, Circle, X } from 'lucide-react';

interface NodeEditorProps {
    nodeId: string;
    currentText: string;
    onUpdate: (id: string, updates: { text?: string; shape?: string; color?: string; strokeStyle?: string; strokeColor?: string }) => void;
    onClose: () => void;
}

const COLORS = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Green', value: '#10B981' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
];

const SHAPES = [
    { id: 'rect', label: 'Rectangle', icon: <Square size={16} /> },
    { id: 'rounded', label: 'Rounded', icon: <Square size={16} style={{ borderRadius: '4px' }} /> },
    { id: 'circle', label: 'Circle', icon: <Circle size={16} /> },
    { id: 'rhombus', label: 'Diamond', icon: <div style={{ transform: 'rotate(45deg)', width: '12px', height: '12px', border: '2px solid currentColor' }} /> },
];

const NodeEditor: React.FC<NodeEditorProps> = ({ nodeId, currentText, onUpdate, onClose }) => {
    const [text, setText] = useState(currentText);
    const [selectedColor, setSelectedColor] = useState('');
    const [strokeColor, setStrokeColor] = useState('');
    const [selectedShape, setSelectedShape] = useState('');
    const [strokeStyle, setStrokeStyle] = useState<string>('solid');
    const [activeTab, setActiveTab] = useState<'fill' | 'outline'>('fill');

    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        top: '80px', // Below the main header
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        opacity: 0,
        maxHeight: '85vh',
        overflowY: 'auto',
        width: '400px', // Slightly wider fixed width
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0,0,0,0.3)'
    });
    const popoverRef = useRef<HTMLDivElement>(null);

    const [hexInput, setHexInput] = useState(selectedColor || '#ffffff');
    const [strokeHexInput, setStrokeHexInput] = useState(strokeColor || '#ffffff');

    // Fade In Effect
    useEffect(() => {
        // slight delay to allow render then fade in
        const timer = setTimeout(() => {
            setPopoverStyle(prev => ({ ...prev, opacity: 1 }));
        }, 10);
        return () => clearTimeout(timer);
    }, []);

    const updateAll = (updates: any) => {
        onUpdate(nodeId, {
            text: updates.text ?? text,
            color: (updates.color ?? selectedColor) || undefined,
            shape: (updates.shape ?? selectedShape) || undefined,
            strokeStyle: updates.strokeStyle ?? strokeStyle,
            strokeColor: (updates.strokeColor ?? strokeColor) || undefined
        });
    };

    const handleTextChange = (val: string) => {
        setText(val);
    };

    const handleHexChange = (val: string, isStroke: boolean) => {
        if (isStroke) {
            setStrokeHexInput(val);
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                setStrokeColor(val);
                updateAll({ strokeColor: val });
            }
        } else {
            setHexInput(val);
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                setSelectedColor(val);
                updateAll({ color: val });
            }
        }
    };

    // Debounce Text
    useEffect(() => {
        const timer = setTimeout(() => {
            if (text !== currentText) {
                updateAll({ text });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [text]);

    const editorContent = (
        <div
            ref={popoverRef}
            className="node-editor-popover compact"
            style={popoverStyle}
        >
            <div className="editor-header">
                <span>Edit Node</span>
                <button onClick={onClose}><X size={14} /></button>
            </div>

            <div className="editor-section">
                <input
                    type="text"
                    className="compact-input"
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Enter text..."
                />
            </div>

            <div className="editor-tabs">
                <button
                    className={`tab-btn ${activeTab === 'fill' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fill')}
                >
                    Fill & Shape
                </button>
                <button
                    className={`tab-btn ${activeTab === 'outline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('outline')}
                >
                    Outline
                </button>
            </div>

            {activeTab === 'fill' ? (
                <>
                    <div className="editor-section">
                        <label>Fill Color</label>
                        <div className="color-section-row">
                            <div className="color-grid compact">
                                {COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        className={`color-swatch ${selectedColor === c.value ? 'active' : ''}`}
                                        style={{ background: c.value || '#333' }}
                                        onClick={() => { setSelectedColor(c.value); setHexInput(c.value || '#333333'); updateAll({ color: c.value }); }}
                                        title={c.name}
                                    />
                                ))}
                                <div className="custom-color-picker" title="Pick Custom Color">
                                    <label htmlFor="fill-color-input" className="color-picker-label">
                                        <div style={{ background: 'linear-gradient(135deg, #ff0000, #00ff00, #0000ff)', width: '100%', height: '100%', borderRadius: '50%' }}></div>
                                    </label>
                                    <input id="fill-color-input" type="color" value={selectedColor || '#ffffff'} onChange={(e) => { setSelectedColor(e.target.value); setHexInput(e.target.value); updateAll({ color: e.target.value }); }} />
                                </div>
                            </div>
                            <input
                                type="text"
                                className="hex-input"
                                value={hexInput}
                                onChange={(e) => handleHexChange(e.target.value, false)}
                                placeholder="#HEX"
                                maxLength={7}
                            />
                        </div>
                    </div>
                    <div className="editor-section">
                        <label>Shape</label>
                        <div className="shape-grid compact">
                            {SHAPES.map(s => (
                                <button
                                    key={s.id}
                                    className={`shape-btn ${selectedShape === s.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedShape(s.id); updateAll({ shape: s.id }); }}
                                    title={s.label}
                                >
                                    {s.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="editor-section">
                        <label>Outline Color</label>
                        <div className="color-section-row">
                            <div className="color-grid compact">
                                {COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        className={`color-swatch ${strokeColor === c.value ? 'active' : ''}`}
                                        style={{ background: 'transparent', border: `2px solid ${c.value || '#fff'}` }}
                                        onClick={() => { setStrokeColor(c.value); setStrokeHexInput(c.value || '#333333'); updateAll({ strokeColor: c.value }); }}
                                        title={c.name}
                                    />
                                ))}
                                <div className="custom-color-picker" title="Pick Custom Outline">
                                    <label htmlFor="stroke-color-input" className="color-picker-label">
                                        <div style={{ background: 'linear-gradient(135deg, #ff0000, #00ff00, #0000ff)', width: '100%', height: '100%', borderRadius: '50%' }}></div>
                                    </label>
                                    <input id="stroke-color-input" type="color" value={strokeColor || '#ffffff'} onChange={(e) => { setStrokeColor(e.target.value); setStrokeHexInput(e.target.value); updateAll({ strokeColor: e.target.value }); }} />
                                </div>
                            </div>
                            <input
                                type="text"
                                className="hex-input"
                                value={strokeHexInput}
                                onChange={(e) => handleHexChange(e.target.value, true)}
                                placeholder="#HEX"
                                maxLength={7}
                            />
                        </div>
                    </div>
                    <div className="editor-section">
                        <label>Border Style</label>
                        <div className="border-style-grid">
                            {['solid', 'dashed', 'dotted'].map((style) => (
                                <button
                                    key={style}
                                    className={`style-btn ${strokeStyle === style ? 'active' : ''}`}
                                    onClick={() => { setStrokeStyle(style); updateAll({ strokeStyle: style }); }}
                                    title={style.charAt(0).toUpperCase() + style.slice(1)}
                                >
                                    <div className={`style-preview ${style}`} style={{ color: strokeColor || '#fff' }}></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <button className="btn-apply" onClick={onClose}>Done</button>
        </div>
    );

    return createPortal(editorContent, document.body);
};

export default NodeEditor;
