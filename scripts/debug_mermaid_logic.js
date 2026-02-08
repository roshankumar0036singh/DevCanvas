
const mermaidCode = `sequenceDiagram
    autonumber
    participant UI as "User Interface"
    participant API as "API Layer"
    participant Storage as "Storage"
    participant Auth as "Auth Service"
    participant DevTools as "Development Tools"

    UI->>API: Request DevCanvas data
    API->>Storage: Fetch data from storage
    Storage->>API: Return data
    API->>UI: Send data to UI
    UI->>UI: Render DevCanvas visualizations

    API->>Auth: Authenticate user
    Auth->>API: Return authentication result
    API->>API: Validate user permissions

    DevTools->>API: Send development requests
    API->>DevTools: Return development responses

    API->>Storage: Save data to storage
    Storage->>API: Confirm data saved

    UI->>UI: Handle user interactions
    UI->>API: Send user input to API
    API->>API: Process user input
    API->>UI: Send processed data to UI`;

function parseSequenceDiagram(mermaidCode) {
    const nodes = [];
    const edges = [];
    const lines = mermaidCode.split('\n');
    const participants = new Map();
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

    const messages = [];
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

    return layoutSequenceDiagram(nodes, edges, participants, messages);
}

function layoutSequenceDiagram(
    nodes,
    _edges,
    participants,
    messages
) {
    const layoutNodes = [];
    const layoutEdges = [];
    const participantX = new Map();
    const SPACING_X = 300;
    const STEP_Y = 100;
    const START_Y = 50;

    // 1. Create Participant Nodes (Top Row)
    // Sort participants by index to ensure correct order
    const sortedParticipants = Array.from(participants.entries()).sort((a, b) => a[1].index - b[1].index);

    sortedParticipants.forEach(([id, data]) => {
        const x = data.index * SPACING_X;
        participantX.set(id, x);

        layoutNodes.push({
            id: `participant_${id}`,
            type: 'rectangle',
            position: { x, y: START_Y },
            data: {
                label: data.label,
                participantId: id,
            }
        });
    });

    // 2. Create Sequence Points and Messages
    let currentY = START_Y + 80; // Start below participants
    const previousPoint = new Map(); // participantId -> lastNodeId

    // Initialize previous points to participant nodes
    sortedParticipants.forEach(([id, _]) => {
        previousPoint.set(id, `participant_${id}`);
    });

    messages.forEach((msg, index) => {
        const srcX = participantX.get(msg.source);
        const tgtX = participantX.get(msg.target);

        if (srcX === undefined || tgtX === undefined) return;

        // Create Sequence Points (Invisible or small dots)
        const srcNodeId = `seq_${index}_src_${msg.source}`;
        const tgtNodeId = `seq_${index}_tgt_${msg.target}`;

        // Source Point
        layoutNodes.push({
            id: srcNodeId,
            type: 'circle',
            position: { x: srcX + 90 - 4, y: currentY },
            data: { label: '' },
        });

        // Target Point
        layoutNodes.push({
            id: tgtNodeId,
            type: 'circle',
            position: { x: tgtX + 90 - 4, y: currentY },
            data: { label: '' },
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
            data: {
                isMessage: true,
                order: index
            }
        });

        // Vertical Lifeline Edges (From previous point to current)
        const prevSrc = previousPoint.get(msg.source);
        layoutEdges.push({
            id: `life_${index}_src_${msg.source}`, // unique ID
            source: prevSrc,
            target: srcNodeId,
            sourceHandle: 'bottom-source',
            targetHandle: 'top-target',
            type: 'straight',
            data: { isLifeline: true }
        });

        const prevTgt = previousPoint.get(msg.target);
        if (msg.source !== msg.target) {
            layoutEdges.push({
                id: `life_${index}_tgt_${msg.target}`,
                source: prevTgt,
                target: tgtNodeId,
                sourceHandle: 'bottom-source',
                targetHandle: 'top-target',
                type: 'straight',
                data: { isLifeline: true }
            });
        }

        previousPoint.set(msg.source, srcNodeId);
        previousPoint.set(msg.target, tgtNodeId);

        currentY += STEP_Y;
    });

    return { nodes: layoutNodes, edges: layoutEdges };
}

const result = parseSequenceDiagram(mermaidCode);
console.log('Nodes:', result.nodes.length);
console.log('Edges:', result.edges.length);
console.log('Participants:', result.nodes.filter(n => n.id.startsWith('participant_')).map(n => n.id));
console.log('Sample Edge:', JSON.stringify(result.edges[0], null, 2));

if (result.edges.length === 0) {
    console.log('ERROR: No edges generated!');
}
