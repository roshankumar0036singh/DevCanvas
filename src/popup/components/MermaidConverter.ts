import dagre from 'dagre';
import { Node, Edge, MarkerType } from 'reactflow';

export interface FlowNode extends Node {
    type: 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'cylinder' | 'entity' | 'group';
    data: {
        label: string;
        color?: string;
        strokeColor?: string;
        strokeStyle?: 'solid' | 'dashed' | 'dotted';
        handleColor?: string;
        textColor?: string;
        imageUrl?: string;
        imageSize?: number;
        strokeWidth?: number;
        groupShape?: 'rectangle' | 'rounded';
        labelBgColor?: string;
        minWidth?: string;
        minHeight?: string;
        isParticipant?: boolean;
        participantId?: string;
        isAnchor?: boolean;
        attributes?: Array<{ type: string; name: string; constraint?: string }>;
    };
}

export type FlowEdge = Edge & {
    style?: {
        stroke?: string;
        strokeWidth?: number;
        strokeDasharray?: string;
    };
    labelStyle?: {
        fill?: string;
        fontWeight?: number;
    };
    labelBgStyle?: {
        fill?: string;
    };
};

export class MermaidConverter {


    /**
     * Convert React Flow to Mermaid code
     */
    static toMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
        // Collect custom edge styles/metadata
        const edgesToSave = edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            style: edge.style,
            labelStyle: edge.labelStyle,
            labelBgStyle: edge.labelBgStyle
        }));

        const edgesComment = edgesToSave.length > 0 ? `\n%% edges: ${JSON.stringify(edgesToSave)}` : '';

        // Collect custom styles for metadata persistence
        const stylesToSave: Record<string, any> = {};
        nodes.forEach(node => {
            if (node.data.color !== '#1e293b' || node.data.strokeColor !== '#0ea5e9' || node.data.strokeStyle !== 'solid' || (node.data.handleColor && node.data.handleColor !== '#00DC82') || node.data.imageUrl) {
                stylesToSave[node.id] = {};
                if (node.data.color !== '#1e293b') stylesToSave[node.id].color = node.data.color;
                if (node.data.strokeColor !== '#0ea5e9') stylesToSave[node.id].strokeColor = node.data.strokeColor;
                if (node.data.strokeStyle !== 'solid') stylesToSave[node.id].strokeStyle = node.data.strokeStyle;
                if (node.data.handleColor !== '#00DC82') stylesToSave[node.id].handleColor = node.data.handleColor;
                if (node.data.imageUrl) stylesToSave[node.id].imageUrl = node.data.imageUrl;
                if (node.data.imageSize) stylesToSave[node.id].imageSize = node.data.imageSize;
                if (node.data.textColor) stylesToSave[node.id].textColor = node.data.textColor;
                if (node.data.strokeWidth) stylesToSave[node.id].strokeWidth = node.data.strokeWidth;
                if (node.data.groupShape) stylesToSave[node.id].groupShape = node.data.groupShape;
                if (node.data.labelBgColor) stylesToSave[node.id].labelBgColor = node.data.labelBgColor;
            }
        });

        const stylesComment = Object.keys(stylesToSave).length > 0 ? `\n%% styles: ${JSON.stringify(stylesToSave)}` : '';

        const hasEntities = nodes.some(n => n.type === 'entity');
        const isSequence = nodes.some(n => n.data.participantId || n.id.startsWith('participant_')) || edges.some(e => e.data?.isSequenceMessage);

        let code = '';
        if (isSequence) {
            code = 'sequenceDiagram\n';

            // Get participants from nodes (loose check for recovery)
            const participants = nodes.filter(n => n.id.startsWith('participant_'));

            // Sort by x position to maintain left-to-right order (Wait, I changed it to y? No, sequence is usually left-to-right x? But vertical layout?)
            // Vertical layout: participants stack vertically on left.


            // Sanitize IDs map
            const idMap = new Map<string, string>();

            participants.sort((a, b) => a.position.x - b.position.x);

            participants.forEach(p => {
                const rawId = p.data.participantId || p.id.replace('participant_', '');
                const sanitizedId = rawId.replace(/[^a-zA-Z0-9_]/g, '_');
                idMap.set(rawId, sanitizedId);

                // Use the original label if different from ID, otherwise check if ID changed during sanitization
                // If I have "User Interface" (id) and label "User Interface".
                // sanitizedId: "User_Interface".
                // Code: participant User_Interface as "User Interface"

                let labelText = p.data.label || rawId;
                const label = labelText && labelText !== sanitizedId ? ` as "${labelText.replace(/"/g, "'").replace(/\n/g, '<br/>')}"` : '';

                code += `    participant ${sanitizedId}${label}\n`;
            });

            const sequenceEdges = edges.filter(e => e.data?.isSequenceMessage);
            sequenceEdges.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));

            // Group edges by message order to avoid duplicates (we have 2 edges per message now)
            const messageMap = new Map<number, { src: string, tgt: string, arrow: string, label: string }>();

            sequenceEdges.forEach(edge => {
                const order = edge.data?.order;
                if (order !== undefined && !messageMap.has(order)) {
                    const rawSrc = edge.data?.sourceParticipant;
                    const rawTgt = edge.data?.targetParticipant;

                    // Use mapped IDs
                    const srcId = idMap.get(rawSrc) || rawSrc?.replace(/[^a-zA-Z0-9_]/g, '_');
                    const tgtId = idMap.get(rawTgt) || rawTgt?.replace(/[^a-zA-Z0-9_]/g, '_');

                    const arrow = edge.data?.originalArrow || '->>';
                    const label = edge.label ? `: ${String(edge.label).replace(/"/g, "'").replace(/\n/g, '<br/>')}` : '';
                    if (srcId && tgtId) {
                        messageMap.set(order, { src: srcId, tgt: tgtId, arrow, label });
                    }
                }
            });

            // Export messages in order
            Array.from(messageMap.entries())
                .sort(([a], [b]) => a - b)
                .forEach(([_, msg]) => {
                    code += `    ${msg.src}${msg.arrow}${msg.tgt}${msg.label}\n`;
                });
        } else if (hasEntities) {
            code = 'erDiagram\n';
            nodes.forEach(node => {
                if (node.type === 'entity') {
                    code += `    ${node.id} {\n`;
                    node.data.attributes?.forEach(attr => {
                        const constraint = attr.constraint ? ` ${attr.constraint}` : '';
                        code += `        ${attr.type} ${attr.name}${constraint}\n`;
                    });
                    code += `    }\n`;
                }
            });

            edges.forEach(edge => {
                const arrow = this.getArrowSymbol(edge.data?.originalArrow || '-->', edge.style);
                const label = edge.label
                    ? `|"${String(edge.label).replace(/"/g, "'").replace(/\n/g, '<br/>')}"|`
                    : '';
                code += `    ${edge.source} ${arrow}${label} ${edge.target}\n`;
            });

            // For ERD we also append styles/layout at end
        } else {
            // Standard Flowchart
            code = 'graph TD\n';
            const positions: Record<string, { x: number, y: number }> = {};
            const groups = nodes.filter(n => n.type === 'group');
            const processedNodes = new Set<string>();

            // 1. Process Groups / Subgraphs
            groups.forEach(group => {
                const safeLabel = group.data.label ? String(group.data.label).replace(/"/g, "'") : group.id;
                code += `    subgraph ${group.id} ["${safeLabel}"]\n`;

                // Add styles for group if any (Mermaid supports style for subgraphs too)
                // For now, implicit via ID.
                positions[group.id] = { x: Math.round(group.position.x), y: Math.round(group.position.y) };
                processedNodes.add(group.id);

                // Process children
                const children = nodes.filter(n => n.parentNode === group.id);
                children.forEach(node => {
                    if (node.id.startsWith('seq_') || node.id.startsWith('end_') || node.id.startsWith('msg_node_')) return;
                    const brackets = this.getNodeBrackets(node.type);
                    const safeLabel = node.data.label
                        ? `"${node.data.label.replace(/"/g, "'").replace(/\n/g, '<br/>')}"`
                        : `"${node.id}"`;
                    code += `        ${node.id}${brackets[0]}${safeLabel}${brackets[1]}\n`;
                    positions[node.id] = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
                    processedNodes.add(node.id);
                });

                code += `    end\n`;
            });

            // 2. Process remaining nodes (not in groups)
            nodes.forEach(node => {
                if (processedNodes.has(node.id)) return;
                if (node.id.startsWith('seq_') || node.id.startsWith('end_') || node.id.startsWith('msg_node_')) return;

                const brackets = this.getNodeBrackets(node.type);
                const safeLabel = node.data.label
                    ? `"${String(node.data.label).replace(/"/g, "'").replace(/\n/g, '<br/>')}"`
                    : `"${node.id}"`;
                code += `    ${node.id}${brackets[0]}${safeLabel}${brackets[1]}\n`;
                positions[node.id] = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
            });

            edges.forEach(edge => {
                const arrow = this.getArrowSymbol(edge.data?.originalArrow || '-->', edge.style);
                const label = edge.label
                    ? `|"${String(edge.label).replace(/"/g, "'").replace(/\n/g, '<br/>')}"|`
                    : '';
                code += `    ${edge.source} ${arrow}${label} ${edge.target}\n`;
            });

            // Append layout info for flowchart
            code += `\n%% layout: ${JSON.stringify(positions)}\n`;
        }

        // Add visual styles (Common for both)
        // Add visual styles (Common for both)
        // Add visual styles (Common for both)
        nodes.forEach(node => {
            // Check if node has non-default styling
            const isGroup = node.type === 'group';
            const defaultColor = isGroup ? 'rgba(0, 0, 0, 0)' : '#1e293b';
            const defaultStroke = isGroup ? '#94a3b8' : '#0ea5e9';
            const defaultStrokeStyle = isGroup ? 'dashed' : 'solid';

            // For sequence diagrams, use participantId for styling, and skip message nodes
            let styleId = node.id;
            if (isSequence) {
                if (node.id.startsWith('msg_node_')) return; // Skip message nodes
                if (node.data.participantId) {
                    styleId = node.data.participantId.replace(/[^a-zA-Z0-9_]/g, '_');
                }
            }

            if (node.data.color !== defaultColor || node.data.strokeColor !== defaultStroke || node.data.strokeStyle !== defaultStrokeStyle) {
                const styles = [];
                if (node.data.color && node.data.color !== defaultColor) {
                    styles.push(`fill:${node.data.color.replace(/\s/g, '')}`);
                }
                if (node.data.strokeColor && node.data.strokeColor !== defaultStroke) styles.push(`stroke:${node.data.strokeColor.replace(/\s/g, '')}`);
                if (node.data.textColor) styles.push(`color:${node.data.textColor.replace(/\s/g, '')}`);

                // Handle stroke style
                if (node.data.strokeStyle === 'dashed') {
                    if (defaultStrokeStyle !== 'dashed') styles.push('stroke-dasharray: 5 5');
                } else if (node.data.strokeStyle === 'dotted') {
                    styles.push('stroke-dasharray: 1 2');
                } else {
                    // Solid
                    if (defaultStrokeStyle !== 'solid') styles.push('stroke-dasharray: 0');
                }

                if (styles.length > 0 || node.data.strokeWidth) {
                    if (node.data.strokeWidth) {
                        styles.push(`stroke-width:${node.data.strokeWidth}px`);
                    } else {
                        styles.push('stroke-width:2px');
                    }
                    code += `    style ${styleId} ${styles.join(',')}\n`;
                }
            }
        });

        code += stylesComment;
        code += edgesComment;

        return code;
    }



    private static getEdgeStyle(arrow: string) {
        if (arrow === '-.->') {
            return { stroke: '#0ea5e9', strokeWidth: 2, strokeDasharray: '5,5' };
        }
        if (arrow === '==>') {
            return { stroke: '#0ea5e9', strokeWidth: 3 };
        }
        return { stroke: '#0ea5e9', strokeWidth: 2 };
    }

    private static getNodeBrackets(type: string | undefined): [string, string] {
        switch (type) {
            case 'rectangle': return ['[', ']'];
            case 'rounded': return ['(', ')'];
            case 'circle': return ['((', '))'];
            case 'diamond': return ['{', '}'];
            case 'cylinder': return ['[(', ')]'];
            default: return ['[', ']'];
        }
    }

    private static getArrowSymbol(arrow: string, style?: any): string {
        // Preserve original arrow type if possible
        if (style?.strokeDasharray) return '-.->';
        if (style?.strokeWidth === 3) return '==>';
        return arrow || '-->';
    }

    /**
     * Convert Mermaid code to React Flow nodes/edges
     */
    static toReactFlow(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {

        // Handle ER diagrams separately (basic support)
        if (mermaidCode.includes('erDiagram')) {
            return this.parseERDiagram(mermaidCode);
        }

        // Handle Sequence diagrams
        if (mermaidCode.includes('sequenceDiagram')) {
            return this.parseSequenceDiagram(mermaidCode);
        }

        // Default to Graph/Flowchart
        return this.parseFlowchart(mermaidCode);
    }

    private static safeParse(jsonString: string, type: 'object' | 'array') {
        try {
            const trimmed = jsonString.trim();
            const startChar = type === 'object' ? '{' : '[';
            const endChar = type === 'object' ? '}' : ']';
            const startIndex = trimmed.indexOf(startChar);
            const endIndex = trimmed.lastIndexOf(endChar);

            if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null;

            const jsonPart = trimmed.substring(startIndex, endIndex + 1);
            return JSON.parse(jsonPart);
        } catch (e) {
            return null;
        }
    }

    private static parseFlowchart(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {
        const edges: FlowEdge[] = [];
        const lines = mermaidCode.split('\n');
        const nodeMap = new Map<string, FlowNode>();

        // Metadata for saved positions and styles
        let savedPositions: Record<string, { x: number, y: number }> = {};
        let savedStyles: Record<string, any> = {};
        let savedEdges: any[] = [];

        // Helper to safely parse JSON from metadata lines handled by this.safeParse

        lines.forEach(line => {
            if (line.trim().startsWith('%% layout:')) {
                const data = this.safeParse(line.replace('%% layout:', ''), 'object');
                if (data) savedPositions = data;
            } else if (line.trim().startsWith('%% styles:')) {
                const data = this.safeParse(line.replace('%% styles:', ''), 'object');
                if (data) savedStyles = data;
            } else if (line.trim().startsWith('%% edges:')) {
                const data = this.safeParse(line.replace('%% edges:', ''), 'array');
                if (data) savedEdges = data;
            }
        });

        // Pass 1.5: Extract inline node definitions (e.g. A[Label] inside an edge line)
        // We do this globally to ensure we catch definitions like A[Label] --> B[Label]
        lines.forEach(line => {
            // Find all occurrences of ID[Label] pattern
            const nodeRegex = /([A-Za-z0-9_.-]+)\s*([([{]{1,2})(.+?)([)\]}]{1,2})/g;
            let match;
            while ((match = nodeRegex.exec(line)) !== null) {
                const id = match[1];
                if (id === 'rgba' || id === 'rgb') continue;

                const openBracket = match[2];
                let label = match[3].trim();
                const closeBracket = match[4];

                // Strip outer quotes if present
                if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
                    label = label.slice(1, -1);
                }

                let type: FlowNode['type'] = 'rectangle';
                if (openBracket === '(' && closeBracket === ')') type = 'rounded';
                else if (openBracket === '((' && closeBracket === '))') type = 'circle';
                else if (openBracket === '{' && closeBracket === '}') type = 'diamond';
                else if (openBracket === '[' && closeBracket === ']') type = 'rectangle';
                else if (openBracket === '[(' && closeBracket === ')]') type = 'cylinder';

                if (!nodeMap.has(id)) {
                    const position = savedPositions[id] || { x: 0, y: 0 };
                    nodeMap.set(id, {
                        id,
                        type,
                        position,
                        data: {
                            label: label.replace(/<br\/>/g, '\n'),
                            color: '#1e293b',
                            strokeColor: '#0ea5e9',
                            strokeStyle: 'solid'
                        }
                    });
                }
            }
        });

        // Second pass: Extract subgraphs and edges (Nodes are mostly handled, but we check specific lines too)
        let currentSubgraph: string | null = null;
        const subgraphs = new Map<string, string>(); // ID -> Label

        lines.forEach((line) => {
            // Treat "subgraph id [label]" or "subgraph id"
            const subgraphMatch = line.match(/^\s*subgraph\s+([A-Za-z0-9_.-]+)(\s*\[.*?\]|\s*".*?")?/);
            if (subgraphMatch) {
                const id = subgraphMatch[1];
                let label = String(subgraphMatch[2]?.trim() || id); // Wrapped label access in String()
                if (label.startsWith('[') && label.endsWith(']')) label = label.slice(1, -1);
                if (label.startsWith('"') && label.endsWith('"')) label = label.slice(1, -1);

                currentSubgraph = id;
                subgraphs.set(id, label);

                const position = savedPositions[id] || { x: 0, y: 0 };
                nodeMap.set(id, {
                    id,
                    type: 'group',
                    position,
                    data: { label, color: 'rgba(0, 0, 0, 0)', strokeColor: '#94a3b8', strokeStyle: 'dashed' },
                    style: { width: 300, height: 200, zIndex: -1 }, // Default size if no layout
                    zIndex: -1
                });
                return;
            }

            if (line.trim() === 'end') {
                currentSubgraph = null;
                return;
            }

            // Edge definition: Source --> Target: Label OR Source -->|Label| Target
            // Prioritize edge matching to avoid "A[Start] --> B" being matched as a weird node "A" with label "Start] --> B"
            // Edge definition: Source --> Target: Label OR Source -->|Label| Target
            // Prioritize edge matching to avoid "A[Start] --> B" being matched as a weird node "A" with label "Start] --> B"
            // Supported formats:
            // A --> B
            // A -->|Label| B
            // A -- Label --> B
            // A -- Label --- B
            const edgeMatch = line.match(/^\s*([A-Za-z0-9_]+)(\s*[( [{})]+.*?[:\]})]+)?\s*(?:(-+>?|-+\.?->|=+>?)|--\s+(.+?)\s+(-->|---))\s*(?:\|(.+?)\|)?\s*([A-Za-z0-9_]+)(\s*[( [{})]+.*?[:\]})]+)?(?:\s*:\s*(.*))?$/);
            if (edgeMatch) {
                const source = edgeMatch[1];
                const sourceDef = edgeMatch[2] ? edgeMatch[2].trim() : '';
                const arrow = edgeMatch[3] || edgeMatch[5];
                const rawLabel = edgeMatch[4] || edgeMatch[6] || edgeMatch[9] || '';
                const target = edgeMatch[7];
                const targetDef = edgeMatch[8] ? edgeMatch[8].trim() : '';
                let label = rawLabel.trim();

                if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
                    label = label.slice(1, -1);
                }

                const parseNodeFromDef = (id: string, def: string) => {
                    if (!def) return { type: 'rectangle' as const, label: id };
                    let type: FlowNode['type'] = 'rectangle';
                    let text = def;

                    if (def.startsWith('((') && def.endsWith('))')) { type = 'circle'; text = def.slice(2, -2); }
                    else if (def.startsWith('([') && def.endsWith('])')) { type = 'rounded'; text = def.slice(2, -2); } // Stadia
                    else if (def.startsWith('[(') && def.endsWith(')]')) { type = 'cylinder'; text = def.slice(2, -2); }
                    else if (def.startsWith('[[') && def.endsWith(']]')) { type = 'rectangle'; text = def.slice(2, -2); } // Subroutine
                    else if (def.startsWith('{{') && def.endsWith('}}')) { type = 'diamond'; text = def.slice(2, -2); } // Hex
                    else if (def.startsWith('{') && def.endsWith('}')) { type = 'diamond'; text = def.slice(1, -1); }
                    else if (def.startsWith('(') && def.endsWith(')')) { type = 'rounded'; text = def.slice(1, -1); }
                    else if (def.startsWith('[') && def.endsWith(']')) { type = 'rectangle'; text = def.slice(1, -1); }

                    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
                        text = text.slice(1, -1);
                    }
                    return { type, label: text.trim() };
                };

                // Update or Create Source Node
                if (!nodeMap.has(source) || sourceDef) {
                    const existing = nodeMap.get(source);
                    const parsed = parseNodeFromDef(source, sourceDef);
                    // Only overwrite if we have a definition OR it's new
                    if (!existing || sourceDef) {
                        nodeMap.set(source, {
                            id: source,
                            type: parsed.type,
                            position: savedPositions[source] || (existing?.position || { x: 0, y: 0 }),
                            data: {
                                label: parsed.label.replace(/<br\/>/g, '\n'),
                                color: '#1e293b',
                                strokeColor: '#0ea5e9',
                                strokeStyle: 'solid',
                                ...existing?.data
                            },
                            ...(currentSubgraph ? { parentNode: currentSubgraph, extent: 'parent' } : {})
                        });
                    }
                }

                // Update or Create Target Node
                if (!nodeMap.has(target) || targetDef) {
                    const existing = nodeMap.get(target);
                    const parsed = parseNodeFromDef(target, targetDef);
                    if (!existing || targetDef) {
                        nodeMap.set(target, {
                            id: target,
                            type: parsed.type,
                            position: savedPositions[target] || (existing?.position || { x: 0, y: 0 }),
                            data: {
                                label: parsed.label.replace(/<br\/>/g, '\n'),
                                color: '#1e293b',
                                strokeColor: '#0ea5e9',
                                strokeStyle: 'solid',
                                ...existing?.data
                            },
                            ...(currentSubgraph ? { parentNode: currentSubgraph, extent: 'parent' } : {})
                        });
                    }
                }

                // Treat cylinder nodes specifically if detected in raw line (legacy check, but kept for safety)
                if (line.includes('[(') && line.includes(')]')) {
                    const updateType = (id: string, def: string) => {
                        if (def.includes('[(')) {
                            const n = nodeMap.get(id);
                            if (n) n.type = 'cylinder';
                        }
                    };
                    updateType(source, sourceDef);
                    updateType(target, targetDef);
                }

                if (label.match(/^rgba?\(|^#|^fill:/)) label = '';

                if (currentSubgraph) {
                    const sNode = nodeMap.get(source);
                    if (sNode && !sNode.parentNode) { sNode.parentNode = currentSubgraph; sNode.extent = 'parent'; }
                    const tNode = nodeMap.get(target);
                    if (tNode && !tNode.parentNode) { tNode.parentNode = currentSubgraph; tNode.extent = 'parent'; }
                }

                let cleanLabel = label.replace(/"/g, "'").replace(/<br\/>/g, '\n');
                if (cleanLabel === '0,0,0,0' || cleanLabel.match(/^rgba?\(0,\s*0,\s*0,\s*0\)/)) cleanLabel = '';

                // Better matching for saved edges.
                // 1. Try exact source/target match + handle match if handles exist
                // 2. Fallback to just source/target match if handles are compatible
                const savedHandle = savedEdges.find(se => {
                    const matchSrc = se.source === source;
                    const matchTgt = se.target === target;
                    if (!matchSrc || !matchTgt) return false;

                    // If we have index based matching? 
                    // For now, let's assume one edge per pair unless distinct handles.
                    return true;
                });

                const edge: FlowEdge = {
                    id: `${source}-${target}-${edges.length}`,
                    source: source!,
                    target: target!,
                    sourceHandle: savedHandle?.sourceHandle,
                    targetHandle: savedHandle?.targetHandle,
                    label: cleanLabel,
                    type: 'editable',
                    style: this.getEdgeStyle(arrow || '-->'),
                    labelStyle: { fill: '#fff', fontWeight: 500 },
                    data: { originalArrow: arrow }
                };

                if (savedHandle) {
                    if (savedHandle.style) edge.style = { ...edge.style, ...savedHandle.style };
                    if (savedHandle.labelStyle) edge.labelStyle = { ...edge.labelStyle, ...savedHandle.labelStyle };
                    if (savedHandle.labelBgStyle) edge.labelBgStyle = { ...edge.labelBgStyle, ...savedHandle.labelBgStyle };
                }

                edges.push(edge);
                return;
            }

            // Node definition: ID[Label] or ID(Label) etc.
            // Check this AFTER edge match
            const nodeMatch = line.match(/^\s*([A-Za-z0-9_]+)\s*([(\[{]{1,2})(.+?)([)\]}]{1,2})\s*$/);
            if (nodeMatch) {
                const id = nodeMatch[1];
                const openBracket = nodeMatch[2];
                let label = nodeMatch[3].trim();
                const closeBracket = nodeMatch[4];

                if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
                    label = label.slice(1, -1);
                }

                let type: FlowNode['type'] = 'rectangle';
                if (openBracket === '(' && closeBracket === ')') type = 'rounded';
                else if (openBracket === '((' && closeBracket === '))') type = 'circle';
                else if (openBracket === '{' && closeBracket === '}') type = 'diamond';
                else if (openBracket === '[' && closeBracket === ']') type = 'rectangle';
                else if (openBracket === '[(' && closeBracket === ')]') type = 'cylinder';

                const position = savedPositions[id] || { x: 0, y: 0 };

                const node: FlowNode = {
                    id,
                    type,
                    position,
                    data: {
                        label: label.replace(/<br\/>/g, '\n'),
                        color: '#1e293b',
                        strokeColor: '#0ea5e9',
                        strokeStyle: 'solid'
                    }
                };
                if (currentSubgraph) {
                    node.parentNode = currentSubgraph;
                    node.extent = 'parent';
                }
                nodeMap.set(id, node);
                return;
            }


        });

        // Third pass: Extract styles
        lines.forEach(line => {
            if (!line.trim().startsWith('style')) return;

            const styleRegex = /style\s+([A-Za-z0-9_]+)\s+(.*)/;
            const match = line.match(styleRegex);

            if (match) {
                const nodeId = match[1];
                const styleStr = match[2];
                const node = nodeMap.get(nodeId);

                if (node) {
                    const styles = styleStr.split(',').reduce((acc, s) => {
                        const [key, val] = s.split(':');
                        if (key && val) acc[key.trim()] = val.trim();
                        return acc;
                    }, {} as Record<string, string>);

                    if (styles['fill']) node.data.color = styles['fill'];
                    if (styles['stroke']) node.data.strokeColor = styles['stroke'];
                    if (styles['color']) node.data.textColor = styles['color'];
                    if (styles['stroke-dasharray']) {
                        node.data.strokeStyle = styles['stroke-dasharray'] === '5 5' ? 'dashed' : 'dotted';
                    }
                    if (styles['stroke-width']) {
                        // We default to 2px, no op needed unless we store width
                    }
                }
            }
        });

        let finalNodes = Array.from(nodeMap.values());

        // Sort nodes so groups are first (rendered bottom) to prevent occluding children
        finalNodes.sort((a, b) => {
            if (a.type === 'group' && b.type !== 'group') return -1;
            if (a.type !== 'group' && b.type === 'group') return 1;
            return 0;
        });

        // Apply saved styles from metadata
        if (Object.keys(savedStyles).length > 0) {
            finalNodes.forEach(node => {
                const style = savedStyles[node.id];
                if (style) {
                    if (style.color) node.data.color = style.color;
                    if (style.strokeColor) node.data.strokeColor = style.strokeColor;
                    if (style.strokeStyle) node.data.strokeStyle = style.strokeStyle;
                    if (style.handleColor) node.data.handleColor = style.handleColor;
                    if (style.imageUrl) node.data.imageUrl = style.imageUrl;
                    if (style.imageSize) node.data.imageSize = style.imageSize;
                    if (style.textColor) node.data.textColor = style.textColor;
                    if (style.strokeWidth) node.data.strokeWidth = style.strokeWidth;
                    if (style.groupShape) node.data.groupShape = style.groupShape;
                    if (style.labelBgColor) node.data.labelBgColor = style.labelBgColor;
                }
            });
        }

        // Only run auto-layout if we don't have saved positions for most nodes
        if (Object.keys(savedPositions).length < finalNodes.length * 0.5) {
            finalNodes = this.calculateLayout(finalNodes, edges);
        }

        return { nodes: finalNodes, edges };
    }

    private static parseERDiagram(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {
        const edges: FlowEdge[] = [];
        const lines = mermaidCode.split('\n');
        const nodeMap = new Map<string, FlowNode>();

        // Metadata for saved positions and styles
        let savedPositions: Record<string, { x: number, y: number }> = {};
        let savedStyles: Record<string, any> = {};
        let savedEdges: any[] = [];

        // First pass: Extract metadata comments
        lines.forEach(line => {
            if (line.trim().startsWith('%% layout:')) {
                try {
                    savedPositions = JSON.parse(line.replace('%% layout:', '').trim());
                } catch (e) {
                    console.error('Failed to parse layout metadata:', e);
                }
            } else if (line.trim().startsWith('%% styles:')) {
                try {
                    savedStyles = JSON.parse(line.replace('%% styles:', '').trim());
                } catch (e) {
                    console.error('Failed to parse styles metadata:', e);
                }
            } else if (line.trim().startsWith('%% edges:')) {
                try {
                    savedEdges = JSON.parse(line.replace('%% edges:', '').trim());
                } catch (e) {
                    console.error('Failed to parse edges metadata:', e);
                }
            }
        });

        // Second pass: Extract entities (nodes) and their attributes
        let currentEntityId: string | null = null;
        lines.forEach(line => {
            const entityMatch = line.match(/^\s*([A-Za-z0-9_]+)\s*\{/);
            if (entityMatch) {
                currentEntityId = entityMatch[1];
                const position = savedPositions[currentEntityId] || { x: 0, y: 0 };
                const node: FlowNode = {
                    id: currentEntityId,
                    type: 'entity',
                    position,
                    data: {
                        label: currentEntityId,
                        color: '#1e293b',
                        strokeColor: '#0ea5e9',
                        strokeStyle: 'solid',
                        attributes: []
                    }
                };
                nodeMap.set(currentEntityId, node);
                return;
            }

            if (currentEntityId && line.trim() === '}') {
                currentEntityId = null;
                return;
            }

            if (currentEntityId) {
                const attributeMatch = line.match(/^\s*([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)(?:\s+([A-Za-z0-9_]+))?/);
                if (attributeMatch) {
                    const type = attributeMatch[1];
                    const name = attributeMatch[2];
                    const constraint = attributeMatch[3];
                    const node = nodeMap.get(currentEntityId);
                    if (node && node.data.attributes) {
                        node.data.attributes.push({ type, name, constraint });
                    }
                }
                return;
            }

            // Edge definition: Source --|{ Target : Label
            const edgeMatch = line.match(/^\s*([A-Za-z0-9_]+)\s*([|<]--?[o|]?[o|]?[->]?)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/);
            if (edgeMatch) {
                const source = edgeMatch[1];
                const arrow = edgeMatch[2];
                const target = edgeMatch[3];
                const label = edgeMatch[4]?.trim() || '';

                // Ensure nodes exist for source and target
                if (!nodeMap.has(source)) {
                    nodeMap.set(source, {
                        id: source,
                        type: 'entity',
                        position: savedPositions[source] || { x: 0, y: 0 },
                        data: { label: source, color: '#1e293b', strokeColor: '#0ea5e9', strokeStyle: 'solid', attributes: [] }
                    });
                }
                if (!nodeMap.has(target)) {
                    nodeMap.set(target, {
                        id: target,
                        type: 'entity',
                        position: savedPositions[target] || { x: 0, y: 0 },
                        data: { label: target, color: '#1e293b', strokeColor: '#0ea5e9', strokeStyle: 'solid', attributes: [] }
                    });
                }

                const cleanLabel = label.replace(/"/g, "'").replace(/<br\/>/g, '\n');

                // Find saved handle info for this edge
                const savedHandle = savedEdges.find(se => se.source === source && se.target === target);

                const edge: FlowEdge = {
                    id: `${source}-${target}-${edges.length}`,
                    source: source!,
                    target: target!,
                    sourceHandle: savedHandle?.sourceHandle,
                    targetHandle: savedHandle?.targetHandle,
                    label: cleanLabel,
                    type: 'editable',
                    style: this.getEdgeStyle(arrow || '-->'),
                    labelStyle: { fill: '#fff', fontWeight: 500 },
                    data: {
                        originalArrow: arrow
                    }
                };

                // Apply saved edge styles if available
                if (savedHandle) {
                    if (savedHandle.style) edge.style = { ...edge.style, ...savedHandle.style };
                    if (savedHandle.labelStyle) edge.labelStyle = { ...edge.labelStyle, ...savedHandle.labelStyle };
                    if (savedHandle.labelBgStyle) edge.labelBgStyle = { ...edge.labelBgStyle, ...savedHandle.labelBgStyle };
                }

                edges.push(edge);
                return;
            }
        });

        // Third pass: Extract styles
        lines.forEach(line => {
            if (!line.trim().startsWith('style')) return;

            const styleRegex = /style\s+([A-Za-z0-9_]+)\s+(.*)/;
            const match = line.match(styleRegex);

            if (match) {
                const nodeId = match[1];
                const styleStr = match[2];
                const node = nodeMap.get(nodeId);

                if (node) {
                    const styles = styleStr.split(',').reduce((acc, s) => {
                        const [key, val] = s.split(':');
                        if (key && val) acc[key.trim()] = val.trim();
                        return acc;
                    }, {} as Record<string, string>);

                    if (styles['fill']) node.data.color = styles['fill'];
                    if (styles['stroke']) node.data.strokeColor = styles['stroke'];
                    if (styles['stroke-dasharray']) {
                        node.data.strokeStyle = styles['stroke-dasharray'] === '5 5' ? 'dashed' : 'dotted';
                    }
                    if (styles['stroke-width']) {
                        // We default to 2px, no op needed unless we store width
                    }
                }
            }
        });

        let finalNodes = Array.from(nodeMap.values());

        // Apply saved styles from metadata
        if (Object.keys(savedStyles).length > 0) {
            finalNodes.forEach(node => {
                const style = savedStyles[node.id];
                if (style) {
                    if (style.color) node.data.color = style.color;
                    if (style.strokeColor) node.data.strokeColor = style.strokeColor;
                    if (style.strokeStyle) node.data.strokeStyle = style.strokeStyle;
                    if (style.handleColor) node.data.handleColor = style.handleColor;
                }
            });
        }

        // Only run auto-layout if we don't have saved positions for most nodes
        if (Object.keys(savedPositions).length < finalNodes.length * 0.5) {
            finalNodes = this.calculateLayout(finalNodes, edges);
        }

        return { nodes: finalNodes, edges };
    }

    private static parseSequenceDiagram(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {
        const nodes: FlowNode[] = [];
        const edges: FlowEdge[] = [];
        const lines = mermaidCode.split('\n');
        const participants = new Map<string, { label: string, index: number }>();
        let participantCount = 0;

        // First pass: Find participants and actors
        lines.forEach(line => {
            const partMatch = line.match(/^\s*(participant|actor)\s+(?:([A-Za-z0-9_.-]+)|"([^"]+)")(?:\s+as\s+(".*?"|'.*?'|[^#\n]+))?/i);
            if (partMatch) {
                const id = partMatch[2] || partMatch[3];
                if (!participants.has(id)) {
                    let label = partMatch[3]?.trim() || id;
                    if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
                        label = label.slice(1, -1);
                    }
                    participants.set(id, { label, index: participantCount++ });
                }
            }
        });

        const messages: { source: string, target: string, label: string, arrow: string }[] = [];
        // Second pass: Find messages and inferred participants
        lines.forEach(line => {
            const msgMatch = line.match(/^\s*(?:([A-Za-z0-9_.-]+)|"([^"]+)")\s*((?:-+|={2,})>+)\s*(?:([A-Za-z0-9_.-]+)|"([^"]+)")\s*:\s*(.*)/);
            if (msgMatch) {
                const source = msgMatch[1] || msgMatch[2];
                const arrow = msgMatch[3];
                const target = msgMatch[4] || msgMatch[5];
                const label = msgMatch[6]?.trim() || '';

                if (!participants.has(source)) {
                    participants.set(source, { label: source, index: participantCount++ });
                }
                if (!participants.has(target)) {
                    participants.set(target, { label: target, index: participantCount++ });
                }
                messages.push({ source, target, label, arrow });
            }
        });

        // Metadata for saved styles
        let savedStyles: Record<string, any> = {};

        // Extract metadata comments (layout, styles, edges)
        lines.forEach(line => {
            if (line.trim().startsWith('%% styles:')) {
                const data = this.safeParse(line.replace('%% styles:', ''), 'object');
                if (data) savedStyles = data;
            }
        });

        const verticalSpacing = 120; // Space between participants vertically
        const participantWidth = 200;
        const participantHeight = 60;
        const messageStartX = 250; // X position where messages start

        // Create simple rectangular participant nodes arranged vertically on the left
        participants.forEach((data, id) => {
            const nodeId = `participant_${id}`;
            nodes.push({
                id: nodeId,
                type: 'rounded',
                position: { x: 0, y: data.index * verticalSpacing },
                data: {
                    label: data.label,
                    color: '#1e293b',
                    strokeColor: '#0ea5e9',
                    strokeStyle: 'solid',
                    textColor: '#ffffff',
                    handleColor: '#00DC82',
                    strokeWidth: 2,
                    participantId: id
                },
                style: { width: participantWidth, height: participantHeight }
            });
        });

        // Create message nodes positioned to the right of participants
        messages.forEach((msg, i) => {
            const sourceParticipant = participants.get(msg.source);
            const targetParticipant = participants.get(msg.target);

            if (sourceParticipant && targetParticipant) {
                // Create a node for the message label
                const messageNodeId = `msg_node_${i}`;
                const messageY = Math.min(sourceParticipant.index, targetParticipant.index) * verticalSpacing +
                    Math.abs(sourceParticipant.index - targetParticipant.index) * verticalSpacing / 2;

                nodes.push({
                    id: messageNodeId,
                    type: 'rounded',
                    position: { x: messageStartX + i * 200, y: messageY },
                    data: {
                        label: msg.label || `Message ${i + 1}`,
                        color: '#0f172a',
                        strokeColor: '#06b6d4',
                        strokeStyle: 'dashed',
                        textColor: '#ffffff',
                        handleColor: '#00DC82',
                        strokeWidth: 1
                    },
                    style: { width: 150, height: 50 }
                });

                // Create edges from source participant to message node
                const sourceNodeId = `participant_${msg.source}`;
                edges.push({
                    id: `edge_src_${i}`,
                    source: sourceNodeId,
                    target: messageNodeId,
                    type: 'editable',
                    animated: msg.arrow.includes('>>'),
                    style: {
                        stroke: '#0ea5e9',
                        strokeWidth: 2,
                        strokeDasharray: msg.arrow.includes('--') ? '5,5' : '0'
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#0ea5e9',
                        width: 20,
                        height: 20
                    },
                    data: {
                        isSequenceMessage: true,
                        originalArrow: msg.arrow,
                        order: i,
                        sourceParticipant: msg.source,
                        targetParticipant: msg.target
                    }
                });

                // Create edge from message node to target participant
                const targetNodeId = `participant_${msg.target}`;
                edges.push({
                    id: `edge_tgt_${i}`,
                    source: messageNodeId,
                    target: targetNodeId,
                    type: 'editable',
                    animated: msg.arrow.includes('>>'),
                    style: {
                        stroke: '#0ea5e9',
                        strokeWidth: 2,
                        strokeDasharray: msg.arrow.includes('--') ? '5,5' : '0'
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#0ea5e9',
                        width: 20,
                        height: 20
                    },
                    data: {
                        isSequenceMessage: true,
                        originalArrow: msg.arrow,
                        order: i,
                        sourceParticipant: msg.source,
                        targetParticipant: msg.target
                    }
                });
            }
        });

        // Apply saved styles from metadata
        if (Object.keys(savedStyles).length > 0) {
            nodes.forEach(node => {
                const style = savedStyles[node.id];
                if (style) {
                    if (style.color) node.data.color = style.color;
                    if (style.strokeColor) node.data.strokeColor = style.strokeColor;
                    if (style.strokeStyle) node.data.strokeStyle = style.strokeStyle;
                    if (style.handleColor) node.data.handleColor = style.handleColor;
                    if (style.textColor) node.data.textColor = style.textColor;
                    if (style.strokeWidth) node.data.strokeWidth = style.strokeWidth;
                }
            });
        }

        // Parse explicit style commands from code (overrides metadata)
        lines.forEach(line => {
            const styleMatch = line.match(/^\s*style\s+([A-Za-z0-9_.-]+)\s+(.*)/i);
            if (styleMatch) {
                const id = styleMatch[1];
                const styles = styleMatch[2];

                // Find node by participantId (which matches the style ID)
                const node = nodes.find(n => n.data.participantId === id);
                if (node) {
                    styles.split(',').forEach(s => {
                        const parts = s.split(':');
                        if (parts.length < 2) return;

                        const k = parts[0].trim();
                        const v = parts.slice(1).join(':').trim(); // Handle values with colons? unlikely but safe

                        if (k === 'fill') node.data.color = v;
                        else if (k === 'stroke') node.data.strokeColor = v;
                        else if (k === 'color') node.data.textColor = v;
                        else if (k === 'stroke-width') {
                            const width = parseInt(v.replace('px', ''), 10);
                            if (!isNaN(width)) node.data.strokeWidth = width;
                        }
                        else if (k === 'stroke-dasharray') {
                            node.data.strokeStyle = (v === '0' || v === 'none') ? 'solid' : 'dashed';
                        }
                    });
                }
            }
        });

        return this.layoutSequenceDiagram(nodes, edges, participants, messages);
    }

    private static layoutSequenceDiagram(
        nodes: FlowNode[],
        _edges: FlowEdge[],
        participants: Map<string, { label: string, index: number }>,
        messages: { source: string, target: string, label: string, arrow: string }[]
    ): { nodes: FlowNode[], edges: FlowEdge[] } {
        const layoutNodes: FlowNode[] = [];
        const layoutEdges: FlowEdge[] = [];
        const participantX = new Map<string, number>();
        const SPACING_X = 300;
        const STEP_Y = 100;
        const START_Y = 50;

        // 1. Create Participant Nodes (Top Row)
        // Sort participants by index to ensure correct order
        const sortedParticipants = Array.from(participants.entries()).sort((a, b) => a[1].index - b[1].index);

        sortedParticipants.forEach(([id, data]) => {
            const x = data.index * SPACING_X;
            participantX.set(id, x);

            // Find original node to preserve styles
            const originalNode = nodes.find(n => n.id === id || n.data?.participantId === id);
            const originalData = originalNode?.data || {} as any;
            layoutNodes.push({
                id: `participant_${id}`,
                type: 'rectangle', // Use default or 'input'/'output' if needed, but default is fine. Actually 'rectangle' in our system?
                // Our system uses types like 'rectangle', 'rounded', etc.
                // Let's use 'rectangle' to match other nodes
                position: { x, y: START_Y },
                data: {
                    label: data.label,
                    participantId: id,
                    color: originalData.color || '#1f2937',
                    strokeColor: originalData.strokeColor || '#3b82f6',
                    textColor: originalData.textColor || '#fff',
                    strokeWidth: originalData.strokeWidth,
                    strokeStyle: originalData.strokeStyle
                },
                style: {
                    width: 180,
                    height: 50,
                    border: `1px ${originalData.strokeStyle === 'dashed' ? 'dashed' : 'solid'} ${originalData.strokeColor || '#3b82f6'}`,
                    borderRadius: '4px',
                    background: '#1f2937',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    zIndex: 10
                },
                zIndex: 10
            });
        });

        // 2. Create Sequence Points and Messages
        let currentY = START_Y + 80; // Start below participants
        const previousPoint = new Map<string, string>(); // participantId -> lastNodeId

        // Initialize previous points to participant nodes
        sortedParticipants.forEach(([id, _]) => {
            previousPoint.set(id, `participant_${id}`);
        });

        messages.forEach((msg, index) => {
            const srcX = participantX.get(msg.source);
            const tgtX = participantX.get(msg.target);

            if (srcX === undefined || tgtX === undefined) return; // Skip invalid messages

            // Create Sequence Points (Invisible or small dots)
            const srcNodeId = `seq_${index}_src_${msg.source}`;
            const tgtNodeId = `seq_${index}_tgt_${msg.target}`;

            // Source Point
            layoutNodes.push({
                id: srcNodeId,
                type: 'circle',
                position: { x: srcX + 90 - 4, y: currentY }, // Center of participant (180/2 = 90) - 4
                data: { label: '' },
                style: { width: 0, height: 0, borderRadius: '50%', background: 'transparent', border: 'none', opacity: 0 },
                zIndex: 5,
                draggable: false // Points shouldn't be dragged individually? Or maybe vertical drag to reorder?
            });

            // Target Point
            layoutNodes.push({
                id: tgtNodeId,
                type: 'circle',
                position: { x: tgtX + 90 - 4, y: currentY },
                data: { label: '' },
                style: { width: 0, height: 0, borderRadius: '50%', background: 'transparent', border: 'none', opacity: 0 },
                zIndex: 5,
                draggable: false
            });

            // Message Edge (Horizontal)
            const isLeftToRight = srcX < tgtX;
            const isSelfLoop = srcX === tgtX;

            layoutEdges.push({
                id: `msg_${index}`,
                source: srcNodeId,
                target: tgtNodeId,
                sourceHandle: isSelfLoop ? 'right-source' : (isLeftToRight ? 'right-source' : 'left-source'),
                targetHandle: isSelfLoop ? 'right-target' : (isLeftToRight ? 'left-target' : 'right-target'),
                label: msg.label,
                type: isSelfLoop ? 'default' : 'smoothstep',
                animated: msg.arrow.includes('--'),
                style: {
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    strokeDasharray: msg.arrow.includes('--') ? '5 5' : 'none'
                },
                labelStyle: { fill: '#fff', fontWeight: 500, fontSize: 12 },
                labelBgStyle: { fill: '#1f2937', fillOpacity: 0.8 },
                data: {
                    isMessage: true,
                    arrowType: msg.arrow,
                    order: index,
                    sourceParticipant: msg.source,
                    targetParticipant: msg.target
                },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
            });

            // Vertical Lifeline Edges (From previous point to current)
            const prevSrc = previousPoint.get(msg.source)!;
            layoutEdges.push({
                id: `life_${index}_src_${msg.source}`, // unique ID
                source: prevSrc,
                target: srcNodeId,
                sourceHandle: 'bottom-source',
                targetHandle: 'top-target',
                type: 'straight',
                style: { stroke: '#4b5563', strokeWidth: 2, strokeDasharray: '5 5' },
                animated: false,
                data: { isLifeline: true }
            });

            const prevTgt = previousPoint.get(msg.target)!;
            if (msg.source !== msg.target) {
                layoutEdges.push({
                    id: `life_${index}_tgt_${msg.target}`,
                    source: prevTgt,
                    target: tgtNodeId,
                    sourceHandle: 'bottom-source',
                    targetHandle: 'top-target',
                    type: 'straight',
                    style: { stroke: '#4b5563', strokeWidth: 2, strokeDasharray: '5 5' },
                    animated: false,
                    data: { isLifeline: true }
                });
            } else {
                // Self loop handling (target node shifted down is typically handled by layout logic)
                // For now, ensuring handles is enough for connection
            }

            previousPoint.set(msg.source, srcNodeId);
            previousPoint.set(msg.target, tgtNodeId);

            currentY += STEP_Y;
        });

        // 3. Extend Lifelines to bottom
        sortedParticipants.forEach(([id, _]) => {
            const lastNode = previousPoint.get(id)!;
            const endNodeId = `end_${id}`;
            layoutNodes.push({
                id: endNodeId,
                type: 'circle', // Use output handle only top
                position: { x: participantX.get(id)! + 90 - 2, y: currentY }, // Center
                data: { label: '' },
                style: { width: 0, height: 0, background: 'transparent', border: 'none', opacity: 0 },
                zIndex: 0
            });
            layoutEdges.push({
                id: `life_end_${id}`,
                source: lastNode,
                target: endNodeId,
                sourceHandle: 'bottom-source',
                targetHandle: 'top-target',
                type: 'straight',
                style: { stroke: '#4b5563', strokeWidth: 2, strokeDasharray: '5 5' },
                data: { isLifeline: true }
            });
        });

        return { nodes: layoutNodes, edges: layoutEdges };
    }

    private static calculateLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
        if (nodes.length === 0) return [];

        const g = new dagre.graphlib.Graph({ compound: true });
        g.setGraph({
            rankdir: 'TD',
            nodesep: 70,
            ranksep: 70,
            edgesep: 30,
            marginx: 20,
            marginy: 20
        });
        g.setDefaultEdgeLabel(() => ({}));

        // Add nodes to dagre
        nodes.forEach(node => {
            // Default dimensions
            let width = 180;
            let height = 70;

            // Adjust based on type
            if (node.type === 'group') {
                // Do not set dimensions for groups, let Dagre calculate bounding box based on children
                g.setNode(node.id, {});
                return;
            } else if (node.type === 'circle') {
                width = 80;
                height = 80;
            }

            g.setNode(node.id, { width, height });
        });

        // Set parents
        nodes.forEach(node => {
            if (node.parentNode) {
                g.setParent(node.id, node.parentNode);
            }
        });

        edges.forEach(edge => {
            g.setEdge(edge.source, edge.target);
        });

        dagre.layout(g);

        return nodes.map(node => {
            const pos = g.node(node.id);
            // Dagre gives center coordinates. React Flow uses top-left.
            // AND React Flow child positions are relative to parent top-left.

            let x = pos.x - pos.width / 2;
            let y = pos.y - pos.height / 2;

            if (node.parentNode) {
                const parentPos = g.node(node.parentNode);
                const parentX = parentPos.x - parentPos.width / 2;
                const parentY = parentPos.y - parentPos.height / 2;

                x = x - parentX;
                y = y - parentY;
            }

            const newNode: FlowNode = {
                ...node,
                position: { x, y }
            };

            // If it's a group, update its style size to match layout
            if (node.type === 'group') {
                newNode.style = {
                    ...node.style,
                    width: pos.width,
                    height: pos.height
                };
            }

            return newNode;
        });
    }
}