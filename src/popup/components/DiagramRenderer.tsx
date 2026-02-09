import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import plantumlEncoder from 'plantuml-encoder';

interface DiagramRendererProps {
    code: string;
    type?: 'mermaid' | 'plantuml';
    onError?: (error: string) => void;
    onNodeSelect?: (nodeId: string, position: { x: number; y: number }) => void;
}

const DiagramRenderer: React.FC<DiagramRendererProps> = ({
    code,
    type = 'mermaid',
    onError,
    onNodeSelect
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [plantUmlUrl, setPlantUmlUrl] = useState<string>('');
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'Inter, system-ui, sans-serif',
        });
    }, []);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!code) {
                setSvg('');
                setPlantUmlUrl('');
                return;
            }

            if (type === 'plantuml') {
                try {
                    const encoded = plantumlEncoder.encode(code);
                    const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
                    setPlantUmlUrl(url);
                    setSvg('');
                    if (onError) onError('');
                    resetTransform();
                } catch (error: unknown) {
                    console.error('PlantUML encode error:', error);
                    setPlantUmlUrl('');
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (onError) onError(errorMessage);
                }
                return;
            }

            setPlantUmlUrl('');
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, code);
                setSvg(svg);
                if (onError) onError('');
                resetTransform();
            } catch (error) {
                console.error('Mermaid render error:', error);
                setSvg('');
                if (onError && error instanceof Error) {
                    onError(error.message);
                }
            }
        };

        renderDiagram();
    }, [code, type, onError]);

    const resetTransform = () => {
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Allow standard scrolling if content fits? No, usually canvas implies zoom.
            // Let's enable zoom by default on wheel.
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Use functional update to access latest state without dependency issues
            setTransform(prev => {
                const contentMouseX = (mouseX - prev.x) / prev.scale;
                const contentMouseY = (mouseY - prev.y) / prev.scale;

                const scaleAmount = -e.deltaY * 0.001;
                let newScale = prev.scale + scaleAmount;
                if (newScale < 0.1) newScale = 0.1;
                if (newScale > 10) newScale = 10;

                const newX = mouseX - contentMouseX * newScale;
                const newY = mouseY - contentMouseY * newScale;

                return { x: newX, y: newY, scale: newScale };
            });
        };

        // Attach with passive: false to allow preventDefault
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []); // Empty dependency array as we use functional updates

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left click
            setIsDragging(true);
            setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            setTransform(prev => ({
                ...prev,
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleZoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 5) }));
    const handleZoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.1) }));

    useEffect(() => {
        if (!contentRef.current || type !== 'mermaid') return;

        const nodes = contentRef.current.querySelectorAll('.node, .actor');
        nodes.forEach(node => {
            (node as HTMLElement).style.cursor = 'pointer';

            // Clone to remove old listeners
            const newNode = node.cloneNode(true);
            node.parentNode?.replaceChild(newNode, node);

            newNode.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                // mouseEvent removed, unused
                const element = e.currentTarget as HTMLElement;
                const nodeId = element.id;

                console.log('Node clicked:', nodeId);
                if (onNodeSelect) {
                    const rect = element.getBoundingClientRect();
                    onNodeSelect(nodeId, {
                        x: rect.left + rect.width / 2,
                        y: rect.top
                    });
                }
            });
        });
    }, [svg, type, onNodeSelect]);

    return (
        <div
            className="diagram-renderer-wrapper"
            style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg-element)', borderRadius: '8px' }}
        >
            <div className="zoom-controls" style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 10 }}>
                <button onClick={handleZoomOut} className="btn-secondary" style={{ padding: '5px 10px' }}>-</button>
                <button onClick={resetTransform} className="btn-secondary" style={{ padding: '5px 10px' }}>{Math.round(transform.scale * 100)}%</button>
                <button onClick={handleZoomIn} className="btn-secondary" style={{ padding: '5px 10px' }}>+</button>
            </div>

            <div
                className="mermaid-container"
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    ref={contentRef}
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transformOrigin: '0 0', // Top-Left for manual calculation
                        transition: isDragging ? 'none' : 'transform 0.05s linear'
                    }}
                >
                    {type === 'mermaid' ? (
                        <div dangerouslySetInnerHTML={{ __html: svg }} />
                    ) : (
                        plantUmlUrl && <img src={plantUmlUrl} alt="PlantUML Diagram" style={{ pointerEvents: 'none' }} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiagramRenderer;
