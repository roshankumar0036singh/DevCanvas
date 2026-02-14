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
        isSequenceNote?: boolean;
        notePosition?: 'left of' | 'right of' | 'over';
        noteParticipants?: string[];
        order?: number;
        attributes?: Array<{ type: string; name: string; constraint?: string }>;
        isPieTitle?: boolean;
        isPieSlice?: boolean;
        isStateNode?: boolean;
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

interface SavedStyle {
    color?: string;
    strokeColor?: string;
    strokeStyle?: string;
    handleColor?: string;
    imageUrl?: string;
    imageSize?: number;
    textColor?: string;
    strokeWidth?: number;
    groupShape?: 'rectangle' | 'rounded';
    labelBgColor?: string;
    width?: string | number;
    height?: string | number;
}

interface SavedEdge {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    style?: Record<string, string | number | undefined>;
    labelStyle?: Record<string, string | number | undefined>;
    labelBgStyle?: Record<string, string | number | undefined>;
    label?: string;
}

interface SequenceItem {
    type: 'message' | 'note';
    source?: string;
    target?: string;
    label?: string;
    arrow?: string;
    position?: string;
    participants?: string[];
}

interface SequenceExportItem {
    type: 'message' | 'note';
    src?: string;
    tgt?: string;
    arrow?: string;
    label?: string;
    position?: string;
    participants?: string[];
}

export class MermaidConverter {


    /**
     * Convert React Flow to Mermaid code
     */
    static toMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
        // Check for Pie Chart
        const pieTitleNode = nodes.find(n => n.data.isPieTitle);
        if (pieTitleNode) {
            let code = `pie title ${pieTitleNode.data.label}\n`;
            // Find slices (connected to center or just all other nodes?)
            // Better to find connected nodes if possible, or just all non-center.
            const slices = nodes.filter(n => n.id !== pieTitleNode.id && n.data.isPieSlice);
            slices.forEach(slice => {
                const text = slice.data.label || 'Slice: 0';
                // Expect format "Label: Value"
                const parts = text.split(':');
                let label = parts[0].trim();
                const value = parts.length > 1 ? parts[1].trim() : '0';

                // Sanitize label
                label = label.replace(/"/g, "'");

                code += `    "${label}" : ${value}\n`;
            });
            return code;
        }

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
        const stylesToSave: Record<string, SavedStyle> = {};
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
                if (node.data.groupShape) stylesToSave[node.id].groupShape = node.data.groupShape;
                if (node.data.labelBgColor) stylesToSave[node.id].labelBgColor = node.data.labelBgColor;
                if (node.style?.width) stylesToSave[node.id].width = node.style.width;
                if (node.style?.height) stylesToSave[node.id].height = node.style.height;
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

                const labelText = p.data.label || rawId;
                const label = labelText && labelText !== sanitizedId ? ` as "${labelText.replace(/"/g, "'").replace(/\n/g, '<br/>')}"` : '';

                code += `    participant ${sanitizedId}${label}\n`;
            });

            const sequenceEdges = edges.filter(e => e.data?.isSequenceMessage);
            sequenceEdges.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));

            // Group edges by message order to avoid duplicates (we have 2 edges per message now)
            const messageMap = new Map<number, SequenceExportItem>();

            sequenceEdges.forEach(edge => {
                const order = edge.data?.order;
                if (order !== undefined && !messageMap.has(order)) {
                    const rawSrc = edge.data?.sourceParticipant;
                    const rawTgt = edge.data?.targetParticipant;

                    // Use mapped IDs
                    const srcId = idMap.get(rawSrc) || rawSrc?.replace(/[^a-zA-Z0-9_]/g, '_');
                    const tgtId = idMap.get(rawTgt) || rawTgt?.replace(/[^a-zA-Z0-9_]/g, '_');

                    const arrow = edge.data?.originalArrow || '->>';
                    if (srcId && tgtId) {
                        messageMap.set(order, { type: 'message', src: srcId, tgt: tgtId, arrow, label: String(edge.label || '') });
                    }
                }
            });

            // Collect Notes
            const noteNodes = nodes.filter(n => n.data.isSequenceNote);
            noteNodes.forEach(note => {
                const order = note.data.order || 0;
                const position = note.data.notePosition || 'over';
                const rawParticipants = note.data.noteParticipants || [];
                const participants = rawParticipants.map((p: string) => idMap.get(p) || p.replace(/[^a-zA-Z0-9_]/g, '_'));

                messageMap.set(order, {
                    type: 'note',
                    position,
                    participants,
                    label: String(note.data.label || '')
                });
            });

            // Export messages and notes in order
            Array.from(messageMap.entries())
                .sort(([a], [b]) => a - b)
                .forEach(([_, item]) => {
                    if (item.type === 'message') {
                        const label = item.label ? `: ${String(item.label).replace(/"/g, "'").replace(/\n/g, '<br/>')}` : '';
                        code += `    ${item.src}${item.arrow}${item.tgt}${label}\n`;
                    } else if (item.type === 'note') {
                        const participants = (item.participants || []).join(',');
                        const label = item.label ? `: ${String(item.label).replace(/"/g, "'").replace(/\n/g, '<br/>')}` : '';
                        code += `    Note ${item.position} ${participants}${label}\n`;
                    }
                });

            // Save layout/dimensions for notes
            const layoutData: Record<string, { w?: string | number, h?: string | number }> = {};
            noteNodes.forEach(node => {
                if (node.width || node.height || node.style?.width || node.style?.height) {
                    layoutData[node.id] = {
                        w: node.width || node.style?.width,
                        h: node.height || node.style?.height
                    };
                }
            });
            if (Object.keys(layoutData).length > 0) {
                code += `\n%% layout: ${JSON.stringify(layoutData)}`;
            }
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
        } else if (nodes.some(n => n.data.isStateNode)) {
            code = 'stateDiagram-v2\n';


            nodes.forEach(node => {
                if (node.id === '[*]') return; // Skip start/end in defs, handled in edges or implicit
                // If label differs from ID, we need 'state "Label" as ID'
                // Or if ID has special chars.

                const label = node.data.label || node.id;

                // For now assume ID is safe or we use it.
                // State diagram supports "state "Desc" as Alias"

                // If label is NOT the ID (and not Start/End which is '[*]')
                if (label !== node.id && node.id !== '[*]') {
                    code += `    state "${label.replace(/"/g, "'")}" as ${node.id}\n`;
                }
            });

            edges.forEach(edge => {
                const source = edge.source;
                const target = edge.target;
                const label = edge.label ? `: ${edge.label}` : '';
                const arrow = '-->'; // Standard state transition

                code += `    ${source} ${arrow} ${target}${label}\n`;
            });

            return code;
        } else {
            // Default to Graph/Flowchart
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
                let arrow = edge.data?.originalArrow || '-->';

                // Enforce valid Flowchart arrows
                if (arrow === '->' || arrow === '->>') arrow = '-->';
                if (arrow === '-.->>' || arrow === '-.->') arrow = '-.->';
                if (arrow === '=>' || arrow === '==>>') arrow = '==>';

                // Fallback to getArrowSymbol for style overrides
                arrow = this.getArrowSymbol(arrow, edge.style);

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
                // Skip internal sequence nodes (message nodes, sequence points, lifeline ends)
                if (node.id.startsWith('msg_node_') || node.id.startsWith('seq_') || node.id.startsWith('end_')) return;
                if (node.data.isSequenceNote) return; // Skip note nodes (they use generic styling or Note keyword)

                if (node.data.participantId) {
                    styleId = node.data.participantId.replace(/[^a-zA-Z0-9_]/g, '_');
                } else if (node.id.startsWith('participant_')) {
                    styleId = node.id.replace('participant_', '').replace(/[^a-zA-Z0-9_]/g, '_');
                } else {
                    // It's a node that is not a participant, but we are in sequence mode?
                    // It shouldn't be here or it's an extra node added by user. 
                    // If added by user, treat as participant?
                    // For now, if it doesn't look like a participant, skip style to be safe.
                    return;
                }
            }

            if (node.data.color !== defaultColor ||
                node.data.strokeColor !== defaultStroke ||
                node.data.strokeStyle !== defaultStrokeStyle ||
                node.data.strokeWidth !== undefined ||
                node.data.textColor !== undefined) {
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
                } else if (node.data.strokeStyle === 'solid') {
                    // Solid
                    if (defaultStrokeStyle !== 'solid') styles.push('stroke-dasharray: 0');
                }

                if (styles.length > 0 || node.data.strokeWidth) {
                    if (node.data.strokeWidth !== undefined) {
                        styles.push(`stroke-width:${node.data.strokeWidth}px`);
                    } else {
                        // For non-groups, we might want to skip if default is 2px, 
                        // but to be safe and consistent with user request:
                        if (!isGroup) styles.push('stroke-width:2px');
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

    private static getArrowSymbol(arrow: string, style?: FlowEdge['style']): string {
        // Preserve original arrow type if possible
        if (style?.strokeDasharray && style.strokeDasharray !== '0' && style.strokeDasharray !== 'none') return '-.->';
        if (style?.strokeWidth === 3) return '==>';
        return arrow || '-->';
    }

    /**
     * Convert Mermaid code to React Flow nodes/edges
     */
    static toReactFlow(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {

        // Handle Pie Charts
        if (mermaidCode.trim().startsWith('pie')) {
            return this.parsePieChart(mermaidCode);
        }

        // Handle Mindmaps
        if (mermaidCode.trim().startsWith('mindmap')) {
            return this.parseMindmap(mermaidCode);
        }

        // Handle ER diagrams
        if (mermaidCode.includes('erDiagram')) {
            return this.parseERDiagram(mermaidCode);
        }

        // Handle Sequence diagrams
        if (mermaidCode.includes('sequenceDiagram')) {
            return this.parseSequenceDiagram(mermaidCode);
        }

        // Handle State diagrams
        if (mermaidCode.includes('stateDiagram') || mermaidCode.includes('stateDiagram-v2')) {
            return this.parseStateDiagram(mermaidCode);
        }



        // Fallback for known unsupported types to prevent empty screen
        if (mermaidCode.includes('gitGraph') || mermaidCode.includes('classDiagram') || mermaidCode.includes('journey') || mermaidCode.includes('requirementDiagram')) {
            return {
                nodes: [{
                    id: 'unsupported_warning',
                    type: 'rectangle',
                    position: { x: 250, y: 250 }, // Center-ish
                    data: {
                        label: `Visual Editing Not Supported\nfor this Diagram Type.\n\nPlease edit in "Code" mode.`,
                        color: '#fef2f2',
                        strokeColor: '#ef4444',
                        textColor: '#991b1b',
                        labelBgColor: '#fef2f2'
                    },
                    style: {
                        width: 300,
                        height: 100,
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        border: '2px dashed #ef4444'
                    }
                }],
                edges: []
            };
        }

        // Default to Graph/Flowchart
        return this.parseFlowchart(mermaidCode);
    }

    private static parseMindmap(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {
        const nodes: FlowNode[] = [];
        const edges: FlowEdge[] = [];
        const lines = mermaidCode.split('\n').filter(l => l.trim() && !l.trim().startsWith('mindmap'));

        const stack: { id: string, indent: number }[] = [];
        let nodeCount = 0;

        lines.forEach(line => {
            const match = line.match(/^(\s*)(.*)/);
            if (!match) return;

            const indent = match[1].length;
            let label = match[2].trim();

            // Extract optional shape and classes
            // e.g. root((Label)):::class
            // or Node:::class

            let className = '';
            if (label.includes(':::')) {
                const parts = label.split(':::');
                label = parts[0];
                className = parts[1];
            }

            let type: FlowNode['type'] = 'rounded';

            // Simple shape detection
            if (label.startsWith('((') && label.endsWith('))')) {
                label = label.slice(2, -2);
                type = 'circle';
            } else if (label.startsWith('(') && label.endsWith(')')) {
                label = label.slice(1, -1);
                type = 'rounded';
            } else if (label.startsWith('[') && label.endsWith(']')) {
                label = label.slice(1, -1);
                type = 'rectangle';
            } else if (label.startsWith('root((') && label.endsWith('))')) {
                label = label.replace(/^root\(\(/, '').replace(/\)\)$/, '');
                type = 'circle';
                // Handle 'root((Label))' specific syntax
            }

            const id = `mm_${nodeCount++}`;

            // Determine parent based on indentation
            while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }

            const parent = stack.length > 0 ? stack[stack.length - 1] : null;

            nodes.push({
                id,
                type,
                position: { x: 0, y: 0 },
                data: { label, color: className.includes('critical') ? '#fee2e2' : undefined }
            });

            if (parent) {
                edges.push({
                    id: `e_${parent.id}_${id}`,
                    source: parent.id,
                    target: id,
                    type: 'smoothstep', // Mindmap branches look good with curves usually, but smoothstep is ok
                    style: { stroke: '#94a3b8' }
                });
            }

            stack.push({ id, indent });
        });

        // Apply basic auto-layout using dagre
        return this.applyLayout(nodes, edges, 'LR'); // Mindmaps usually grow right
    }

    private static parseStateDiagram(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {
        const nodes: FlowNode[] = [];
        const edges: FlowEdge[] = [];
        const lines = mermaidCode.split('\n');
        const nodeMap = new Map<string, string>(); // Id -> Label

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('stateDiagram') || trimmed.startsWith('classDef')) return;

            // 1. Parse Transitions: A --> B : Label
            // Supports: [*] --> B
            const transitionMatch = trimmed.match(/^([a-zA-Z0-9_[\]*]+)\s*-->\s*([a-zA-Z0-9_[\]*]+)(?:\s*:\s*(.*))?$/);
            if (transitionMatch) {
                const source = transitionMatch[1];
                const target = transitionMatch[2];
                const label = transitionMatch[3];

                [source, target].forEach(id => {
                    if (!nodeMap.has(id)) {
                        nodeMap.set(id, id === '[*]' ? 'Start/End' : id);
                        nodes.push({
                            id,
                            type: id === '[*]' ? 'circle' : 'rounded',
                            position: { x: 0, y: 0 },
                            data: {
                                label: nodeMap.get(id)!,
                                isStateNode: true
                            }
                        });
                    }
                });

                edges.push({
                    id: `e_${source}_${target}_${edges.length}`,
                    source,
                    target,
                    label,
                    type: 'smoothstep',
                    style: { stroke: '#0ea5e9' }
                });
                return;
            }

            // 2. Parse State Definitions: state "Description" as ID
            const stateDefMatch = trimmed.match(/^state\s+"(.+)"\s+as\s+([a-zA-Z0-9_]+)$/);
            if (stateDefMatch) {
                const label = stateDefMatch[1];
                const id = stateDefMatch[2];
                nodeMap.set(id, label);
                // Check if node exists and update label, or create
                const existing = nodes.find(n => n.id === id);
                if (existing) {
                    existing.data.label = label;
                } else {
                    nodes.push({
                        id,
                        type: 'rounded',
                        position: { x: 0, y: 0 },
                        data: {
                            label,
                            isStateNode: true
                        }
                    });
                }
            }
        });

        return this.applyLayout(nodes, edges, 'TD');
    }

    private static applyLayout(nodes: FlowNode[], edges: FlowEdge[], direction: 'TD' | 'LR' = 'TD'): { nodes: FlowNode[], edges: FlowEdge[] } {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 50 });
        g.setDefaultEdgeLabel(() => ({}));

        nodes.forEach(node => {
            const width = Math.max(100, (node.data.label?.length || 0) * 8 + 20);
            const height = 50;
            g.setNode(node.id, { width, height });
        });

        edges.forEach(edge => {
            g.setEdge(edge.source, edge.target);
        });

        dagre.layout(g);

        return {
            nodes: nodes.map(node => {
                const pos = g.node(node.id);
                return {
                    ...node,
                    position: {
                        x: pos.x - (g.node(node.id).width / 2),
                        y: pos.y - (g.node(node.id).height / 2)
                    }
                };
            }),
            edges
        };
    }

    private static parsePieChart(mermaidCode: string): { nodes: FlowNode[], edges: FlowEdge[] } {
        const nodes: FlowNode[] = [];
        const edges: FlowEdge[] = [];
        const lines = mermaidCode.split('\n');

        // Find title
        let title = 'Pie Chart';
        const titleLine = lines.find(l => l.trim().startsWith('title'));
        const pieLine = lines.find(l => l.trim().startsWith('pie'));

        if (titleLine) {
            title = titleLine.replace('title', '').trim();
        } else if (pieLine && pieLine.includes('title')) {
            title = pieLine.split('title')[1].trim();
        }

        const centerId = 'pie_center';
        nodes.push({
            id: centerId,
            type: 'circle',
            position: { x: 400, y: 300 },
            data: {
                label: title,
                isPieTitle: true,
                color: '#f59e0b',
                strokeColor: '#d97706',
                textColor: '#ffffff'
            },
            style: { width: 150, height: 150, fontWeight: 700, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
        });

        const radius = 250;
        let angle = 0;
        let sliceIndex = 0;

        const slices: { label: string, value: string }[] = [];
        lines.forEach(line => {
            const match = line.match(/^\s*"(.+)"\s*:\s*([\d.]+)/);
            if (match) {
                slices.push({ label: match[1], value: match[2] });
            }
        });

        const angleStep = (2 * Math.PI) / (slices.length || 1);

        slices.forEach(slice => {
            const id = `slice_${sliceIndex++}`;

            // Calculate circular layout
            const x = 400 + radius * Math.cos(angle) - 75; // -75 to center 150px node
            const y = 300 + radius * Math.sin(angle) - 25;
            angle += angleStep;

            nodes.push({
                id,
                type: 'rectangle',
                position: { x, y },
                data: { label: `${slice.label}: ${slice.value}`, isPieSlice: true }
            });

            edges.push({
                id: `edge_${id}`,
                source: centerId,
                target: id,
                type: 'straight',
                style: { stroke: '#94a3b8', strokeWidth: 2 }
            });
        });

        return { nodes, edges };
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
        let savedStyles: Record<string, SavedStyle> = {};
        let savedEdges: SavedEdge[] = [];

        // Helper to safely parse JSON from metadata lines handled by this.safeParse

        lines.forEach(line => {
            if (line.trim().startsWith('%% layout:')) {
                const data = this.safeParse(line.replace('%% layout:', ''), 'object');
                if (data) savedPositions = data;
            } else if (line.trim().startsWith('%% styles:')) {
                const data = this.safeParse(line.replace('%% styles:', ''), 'object');
                if (data) savedStyles = data as Record<string, SavedStyle>;
            } else if (line.trim().startsWith('%% edges:')) {
                const data = this.safeParse(line.replace('%% edges:', ''), 'array');
                if (data) savedEdges = data as SavedEdge[];
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


            const edgeRegex = /^\s*([A-Za-z0-9_.-]+)(\s*[( [{]{1,2}.*?[) \]}]{1,2})?\s*(?:(-+>?|-+\.?->|=+>?)|--\s+(?:"?(.+?)"?)\s+(-->|---))\s*(?:\|(?:("?)(.+?)\6)\|)?\s*([A-Za-z0-9_.-]+)(\s*[( [{]{1,2}.*?[) \]}]{1,2})?(?:\s*:\s*(.*))?$/;
            const edgeMatch = line.match(edgeRegex);
            if (edgeMatch) {
                const source = edgeMatch[1];
                const sourceDef = edgeMatch[2] ? edgeMatch[2].trim() : '';
                const arrow = edgeMatch[3] || edgeMatch[5];
                const rawLabel = edgeMatch[4] || edgeMatch[7] || edgeMatch[10] || '';
                const target = edgeMatch[8];
                const targetDef = edgeMatch[9] ? edgeMatch[9].trim() : '';
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
                    // stricter parenting: only parent if not already parented AND defined in this subgraph block
                    // CRITICAL: Prevent self-reference (e.g. subgraph A -> node A inside)
                    if (sNode && !sNode.parentNode && sNode.id !== currentSubgraph) {
                        sNode.parentNode = currentSubgraph;
                        sNode.extent = 'parent';
                    }

                    const tNode = nodeMap.get(target);
                    if (tNode && !tNode.parentNode && tNode.id !== currentSubgraph) {
                        tNode.parentNode = currentSubgraph;
                        tNode.extent = 'parent';
                    }
                }

                let cleanLabel = label.replace(/"/g, "'").replace(/<br\/>/g, '\n');
                if (cleanLabel === '0,0,0,0' || cleanLabel.match(/^rgba?\(0,\s*0,\s*0,\s*0\)/)) cleanLabel = '';

                // Duplicate Check: Prevent adding exact same edge twice
                const duplicateExists = edges.some(e =>
                    e.source === source &&
                    e.target === target &&
                    e.label === cleanLabel &&
                    e.data?.originalArrow === arrow
                );
                if (duplicateExists) return;

                // Better matching for saved edges with LABEL awareness
                const savedHandle = savedEdges.find(se => {
                    const matchSrc = se.source === source;
                    const matchTgt = se.target === target;
                    if (!matchSrc || !matchTgt) return false;

                    // If saved edge has a label, it MUST match. If it doesn't, we only match if current edge also has no label (or we're lenient)
                    // Strict match on label prevents "swapping" of styles between two edges A->B
                    if (se.label && cleanLabel && se.label !== cleanLabel) return false;

                    // If one has label and other doesn't? 
                    // Let's rely on the fact that if we saved it, we saved the label.
                    return true;
                });

                const labelHash = cleanLabel ? Array.from(cleanLabel).reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
                // Use a safer index based on content, or just standard enumeration but filtered by uniqueness
                const edgeIndex = edges.filter(e => e.source === source && e.target === target).length;

                const edge: FlowEdge = {
                    id: `${source}-${target}-${labelHash}-${edgeIndex}`, // ID includes hash, so label change = new ID (correct)
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (savedHandle.style) edge.style = { ...edge.style, ...(savedHandle.style as any) };
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (savedHandle.labelStyle) edge.labelStyle = { ...edge.labelStyle, ...(savedHandle.labelStyle as any) };
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (savedHandle.labelBgStyle) edge.labelBgStyle = { ...edge.labelBgStyle, ...(savedHandle.labelBgStyle as any) };
                }

                edges.push(edge);
                return;
            }

            // Node definition: ID[Label] or ID(Label) etc.
            // Check this AFTER edge match
            const nodeMatch = line.match(/^\s*([A-Za-z0-9_]+)\s*([([{]{1,2})(.+?)([)\]}]{1,2})\s*$/);
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
                        const width = parseInt(styles['stroke-width'].replace('px', ''));
                        if (!isNaN(width)) node.data.strokeWidth = width;
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
                    if (style.strokeStyle) node.data.strokeStyle = style.strokeStyle as 'solid' | 'dashed' | 'dotted';
                    if (style.handleColor) node.data.handleColor = style.handleColor;
                    if (style.imageUrl) node.data.imageUrl = style.imageUrl;
                    if (style.imageSize) node.data.imageSize = style.imageSize;
                    if (style.textColor) node.data.textColor = style.textColor;
                    if (style.strokeWidth) node.data.strokeWidth = style.strokeWidth;
                    if (style.groupShape) node.data.groupShape = style.groupShape;
                    if (style.groupShape) node.data.groupShape = style.groupShape;
                    if (style.labelBgColor) node.data.labelBgColor = style.labelBgColor;
                    if (style.width || style.height) {
                        node.style = {
                            ...node.style,
                            width: style.width,
                            height: style.height
                        };
                    }
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
        let savedStyles: Record<string, SavedStyle> = {};
        let savedEdges: SavedEdge[] = [];

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
                    if (style.strokeStyle) node.data.strokeStyle = style.strokeStyle as 'solid' | 'dashed' | 'dotted';
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

        const sequenceItems: SequenceItem[] = [];
        // Second pass: Find messages, notes and inferred participants
        lines.forEach(line => {
            const msgMatch = line.match(/^\s*(?:([A-Za-z0-9_.-]+)|"([^"]+)")\s*((?:-+|={2,})>+)\s*(?:([A-Za-z0-9_.-]+)|"([^"]+)")\s*:\s*(.*)/);
            if (msgMatch) {
                const source = msgMatch[1] || msgMatch[2];
                const arrow = msgMatch[3];
                const target = msgMatch[4] || msgMatch[5];
                const label = msgMatch[6]?.trim() || '';

                if (!participants.has(source)) participants.set(source, { label: source, index: participantCount++ });
                if (!participants.has(target)) participants.set(target, { label: target, index: participantCount++ });

                sequenceItems.push({ type: 'message', source, target, label, arrow });
                return;
            }

            const noteMatch = line.match(/^\s*Note\s+(left of|right of|over)\s+(.*?):\s*(.*)/i);
            if (noteMatch) {
                const position = noteMatch[1].toLowerCase();
                const participantsStr = noteMatch[2];
                const text = noteMatch[3].trim();
                const noteParticipants = participantsStr.split(',').map(p => p.trim());

                noteParticipants.forEach(p => {
                    if (!participants.has(p)) participants.set(p, { label: p, index: participantCount++ });
                });

                sequenceItems.push({ type: 'note', position, participants: noteParticipants, label: text });
            }
        });

        // Metadata for saved styles and edges
        let savedStyles: Record<string, SavedStyle> = {};
        let savedEdges: SavedEdge[] = [];
        let savedLayout: Record<string, { w?: number, h?: number }> = {};

        // Extract metadata comments (layout, styles, edges)
        lines.forEach(line => {
            if (line.trim().startsWith('%% styles:')) {
                const data = this.safeParse(line.replace('%% styles:', ''), 'object');
                if (data) savedStyles = data as Record<string, SavedStyle>;
            } else if (line.trim().startsWith('%% edges:')) {
                const data = this.safeParse(line.replace('%% edges:', ''), 'array');
                if (data) savedEdges = data as SavedEdge[];
            } else if (line.trim().startsWith('%% layout:')) {
                const data = this.safeParse(line.replace('%% layout:', ''), 'object');
                if (data) savedLayout = data as Record<string, { w?: number, h?: number }>;
            }
        });

        const verticalSpacing = 120; // Space between participants vertically
        const participantWidth = 200;
        const participantHeight = 60;


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

        // Legacy message node generation removed (handled by layoutSequenceDiagram now)


        // Apply saved styles from metadata
        if (Object.keys(savedStyles).length > 0) {
            nodes.forEach(node => {
                const style = savedStyles[node.id];
                if (style) {
                    if (style.color) node.data.color = style.color;
                    if (style.strokeColor) node.data.strokeColor = style.strokeColor;
                    if (style.strokeStyle) node.data.strokeStyle = style.strokeStyle as 'solid' | 'dashed' | 'dotted';
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

        return this.layoutSequenceDiagram(nodes, edges, participants, sequenceItems, savedStyles, savedEdges, savedLayout);
    }

    private static layoutSequenceDiagram(
        nodes: FlowNode[],
        _edges: FlowEdge[],
        participants: Map<string, { label: string, index: number }>,
        items: SequenceItem[],
        savedStyles: Record<string, SavedStyle> = {},
        savedEdges: SavedEdge[] = [],
        savedLayout: Record<string, { w?: number, h?: number }> = {}
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
            const originalData = (originalNode?.data || {}) as Partial<FlowNode['data']>;
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

        items.forEach((item, index) => {
            if (item.type === 'message') {
                const msg = item;
                if (!msg.source || !msg.target) return; // Skip invalid messages
                const msgSource = msg.source;
                const msgTarget = msg.target;

                const srcX = participantX.get(msgSource);
                const tgtX = participantX.get(msgTarget);

                if (srcX === undefined || tgtX === undefined) return; // Skip if participants not found

                // Create Sequence Points (Invisible or small dots)
                const srcNodeId = `seq_${index}_src_${msgSource}`;
                const tgtNodeId = `seq_${index}_tgt_${msgTarget}`;

                // Source Point
                layoutNodes.push({
                    id: srcNodeId,
                    type: 'circle',
                    position: { x: srcX + 90 - 4, y: currentY }, // Offset to center below participant
                    data: { label: '', isAnchor: true, color: 'transparent', strokeWidth: 0, strokeColor: 'transparent' },
                    zIndex: 5,
                    draggable: false // Points shouldn't be dragged individually? Or maybe vertical drag to reorder?
                });

                // Target Point
                layoutNodes.push({
                    id: tgtNodeId,
                    type: 'circle',
                    position: { x: tgtX + 90 - 4, y: currentY },
                    data: { label: '', isAnchor: true, color: 'transparent', strokeWidth: 0, strokeColor: 'transparent' },
                    zIndex: 5,
                    draggable: false
                });

                // Message Edge (Horizontal)
                const isLeftToRight = srcX < tgtX;
                const isSelfLoop = srcX === tgtX;

                const savedEdge = savedEdges.find(e => e.source === srcNodeId && e.target === tgtNodeId);

                layoutEdges.push({
                    id: `msg_${index}`,
                    source: srcNodeId,
                    target: tgtNodeId,
                    sourceHandle: isSelfLoop ? 'right-source' : (isLeftToRight ? 'right-source' : 'left-source'),
                    targetHandle: isSelfLoop ? 'right-target' : (isLeftToRight ? 'left-target' : 'right-target'),
                    label: msg.label || '',
                    type: isSelfLoop ? 'default' : 'smoothstep',
                    animated: (msg.arrow || '').includes('--'),
                    style: {
                        stroke: (savedEdge?.style?.stroke as string) || '#3b82f6',
                        strokeWidth: (savedEdge?.style?.strokeWidth as number) || 2,
                        strokeDasharray: (savedEdge?.style?.strokeDasharray as string) || ((msg.arrow || '').includes('--') ? '5,5' : '0')
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelStyle: savedEdge?.labelStyle as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelBgStyle: savedEdge?.labelBgStyle as any,
                    data: {
                        isSequenceMessage: true,
                        arrowType: msg.arrow,
                        order: index,
                        sourceParticipant: msgSource,
                        targetParticipant: msgTarget
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, color: (savedEdge?.style?.stroke as string) || '#3b82f6' }
                });

                // Vertical Lifeline Edges (From previous point to current)
                const prevSrc = previousPoint.get(msgSource)!;
                layoutEdges.push({
                    id: `life_${index}_src_${msgSource}`, // unique ID
                    source: prevSrc,
                    target: srcNodeId,
                    sourceHandle: 'bottom-source',
                    targetHandle: 'top-target',
                    type: 'straight',
                    style: { stroke: '#4b5563', strokeWidth: 2, strokeDasharray: '5 5' },
                    animated: false,
                    data: { isLifeline: true }
                });

                const prevTgt = previousPoint.get(msgTarget)!;
                if (msgSource !== msgTarget) {
                    layoutEdges.push({
                        id: `life_${index}_tgt_${msgTarget}`,
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

                previousPoint.set(msgSource, srcNodeId);
                previousPoint.set(msgTarget, tgtNodeId);

                currentY += STEP_Y;
            } else if (item.type === 'note') {
                const note = item;
                // Calculate note position
                let x = 0;
                let width = 150;

                if (note.position === 'over' && note.participants) {
                    if (note.participants.length > 1) {
                        // Span multiple
                        const minIndex = Math.min(...note.participants.map((p: string) => participants.get(p)?.index || 0));
                        const maxIndex = Math.max(...note.participants.map((p: string) => participants.get(p)?.index || 0));
                        const minX = minIndex * SPACING_X;
                        const maxX = maxIndex * SPACING_X;
                        // Span from left edge of first to right edge of last
                        // Tighter fit: Center relative to lifelines
                        x = minX + 45;
                        width = (maxX - minX) + 90; // Covers from min+45 to max+135 (Lifelines are at +90)
                    } else if (note.participants.length > 0) {
                        // Over single - Center on participant
                        const pId = note.participants[0];
                        const pX = participantX.get(pId) || 0;
                        x = pX + 25; // Centered narrower
                        width = 130;
                    }
                } else if (note.position === 'left of' && note.participants && note.participants.length > 0) {
                    const pId = note.participants[0];
                    const pX = participantX.get(pId) || 0;
                    x = pX - 160; // Place directly to the left of the participant box
                } else if (note.position === 'right of' && note.participants && note.participants.length > 0) {
                    const pId = note.participants[0];
                    const pX = participantX.get(pId) || 0;
                    x = pX + 190; // Place directly to the right
                }

                const savedDim = savedLayout[`note_${index}`];
                if (savedDim && savedDim.w) width = savedDim.w;

                layoutNodes.push({
                    id: `note_${index}`,
                    type: 'rectangle', // Use rectangle but styled as note
                    position: { x, y: currentY },
                    data: {
                        label: note.label || '',
                        isSequenceNote: true,
                        notePosition: note.position as 'left of' | 'right of' | 'over' | undefined,
                        noteParticipants: note.participants,
                        order: index,
                        color: savedStyles[`note_${index}`]?.color || '#fef3c7',
                        textColor: savedStyles[`note_${index}`]?.textColor || '#000000',
                        strokeColor: savedStyles[`note_${index}`]?.strokeColor || '#d97706',
                        strokeStyle: (savedStyles[`note_${index}`]?.strokeStyle as 'solid' | 'dashed' | 'dotted') || 'solid'
                    },
                    style: {
                        width,
                        minHeight: (savedDim && savedDim.h) ? savedDim.h : 40,
                        height: (savedDim && savedDim.h) ? savedDim.h : undefined,
                        background: savedStyles[`note_${index}`]?.color || '#fef3c7',
                        color: savedStyles[`note_${index}`]?.textColor || '#000',
                        border: `1px ${savedStyles[`note_${index}`]?.strokeStyle === 'dashed' ? 'dashed' : 'solid'} ${savedStyles[`note_${index}`]?.strokeColor || '#d97706'}`,
                        borderRadius: '0px', // Notes usually rectangular/folded
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        padding: '4px',
                        zIndex: 20
                    }
                });
                currentY += STEP_Y;
            }
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
            marginx: 40,
            marginy: 40
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