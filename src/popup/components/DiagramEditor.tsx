

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Sparkles, Download, Code2, Eye, Layers, LayoutTemplate, Copy, Group } from 'lucide-react';
import { parseRepoStructure, buildStructureMap, FileNode, stringifyStructNode } from '../../utils/structureParser';
import AIProcessingOverlay from './AIProcessingOverlay';
import DiagramRenderer from './DiagramRenderer';
import DiagramStylePanel from './DiagramStylePanel';
import ReactFlowEditor from './ReactFlowEditor';
import { MermaidConverter, FlowNode, FlowEdge } from './MermaidConverter';
import { Node, Edge, MarkerType, getRectOfNodes } from 'reactflow';
import storage from '../../utils/storage';
import { toPng } from 'html-to-image';
import { DIAGRAM_TEMPLATES } from '../../utils/templates';
import { MessageType } from '../../utils/messaging';
import TourOverlay from './TourOverlay';
import { generateCodeTour, TourStep } from '../../utils/rag/tourGenerator';

interface DiagramEditorProps {
    diagramId: string | null;
    onBack: () => void;
    onOpenDocument: (id: string) => void;
}

const DEFAULT_CODE = `graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B`;

interface SelectedNode {
    id: string;
    text: string;
    position: { x: number; y: number };
    color?: string;
    shape?: string;
    strokeColor?: string;
    strokeStyle?: string;
    handleColor?: string;
    textColor?: string;
    imageUrl?: string;
    parentNode?: string;
    strokeWidth?: number;
    groupShape?: string;
    labelBgColor?: string;
    imageSize?: number;
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({ diagramId, onBack, onOpenDocument }) => {
    const [code, setCode] = useState(DEFAULT_CODE);
    const [title, setTitle] = useState('Untitled Diagram');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCode, setShowCode] = useState(true);
    const [diagramLanguage, setDiagramLanguage] = useState<'mermaid' | 'plantuml'>('mermaid');
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
    const [showStylePanel, setShowStylePanel] = useState(false);

    // React Flow state
    const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');
    const [flowNodes, setFlowNodes] = useState<Node[]>([]);
    const [flowEdges, setFlowEdges] = useState<Edge[]>([]);

    // Visual Editor Styles
    const [bgColor, setBgColor] = useState('#0d1117');
    const [bgPattern, setBgPattern] = useState<'dots' | 'lines' | 'cross' | 'none'>('dots');

    // AI Modal State

    const [showAIModal, setShowAIModal] = useState(false);
    const [aiMode, setAiMode] = useState<'instruction' | 'code-import' | 'logic-flow' | 'tour'>('instruction');
    const [aiInstruction, setAiInstruction] = useState('');
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiMessage, setAiMessage] = useState('');

    // Tour State
    const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
    const [currentTourStep, setCurrentTourStep] = useState(0);
    const [isTourActive, setIsTourActive] = useState(false);
    const [preTourSnapshot, setPreTourSnapshot] = useState<{
        nodes: Node[],
        edges: Edge[],
        code: string,
        editorMode: 'code' | 'visual'
    } | null>(null);


    // Template Modal State
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateCategory, setTemplateCategory] = useState<string>('All');
    const [diagramMetadata, setDiagramMetadata] = useState<{ repoStructure?: unknown; extraContext?: unknown; viewPath?: string } | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);
    const [dragStartCode, setDragStartCode] = useState<string | null>(null);

    // Refs to track latest state for unmount saving
    const flowNodesRef = React.useRef(flowNodes);
    const flowEdgesRef = React.useRef(flowEdges);
    const editorModeRef = React.useRef(editorMode);
    const diagramIdRef = React.useRef(diagramId);
    const titleRef = React.useRef(title);

    useEffect(() => {
        flowNodesRef.current = flowNodes;
        flowEdgesRef.current = flowEdges;
        editorModeRef.current = editorMode;
        diagramIdRef.current = diagramId;
        titleRef.current = title;
    }, [flowNodes, flowEdges, editorMode, diagramId, title]);

    // Save on Unmount (Critical for tab switching/back button)
    useEffect(() => {
        return () => {
            if (editorModeRef.current === 'visual' && diagramIdRef.current) {
                console.log('diagramEditor: Unmounting, forcing save of visual state...');
                const latestNodes = flowNodesRef.current;
                const latestEdges = flowEdgesRef.current;
                try {
                    const latestCode = MermaidConverter.toMermaid(latestNodes as unknown as FlowNode[], latestEdges as FlowEdge[]);
                    storage.updateDiagram(diagramIdRef.current, {
                        content: latestCode,
                        title: titleRef.current,
                        type: 'mermaid',
                        updatedAt: Date.now()
                    });
                } catch (e: unknown) {
                    console.error('Failed to auto-save on unmount:', e);
                }
            }
        };
    }, []);

    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss notification
    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), 3000);
        return () => clearTimeout(timer);
    }, [notification]);

    const pushToHistory = useCallback((newCode: string) => {
        // Prevent duplicate history entries
        setHistory(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === newCode) return prev;
            return [...prev, newCode];
        });
        setRedoStack([]); // Clear redo stack on new action
    }, []);

    const handleNodeDragStart = useCallback(() => {
        setDragStartCode(code);
    }, [code]);

    const handleNodeDragStop = useCallback(() => {
        if (dragStartCode && dragStartCode !== code) {
            setHistory(prev => {
                if (prev.length > 0 && prev[prev.length - 1] === dragStartCode) return prev;
                return [...prev, dragStartCode];
            });
            setRedoStack([]);
        }
        setDragStartCode(null);
    }, [dragStartCode, code]);

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setRedoStack(prev => [...prev, code]);
        setHistory(prev => prev.slice(0, -1));
        setCode(previous);
        setNotification({ message: 'Undo', type: 'success' });
    }, [history, code]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, code]);
        setRedoStack(prev => prev.slice(0, -1));
        setCode(next);
        setNotification({ message: 'Redo', type: 'success' });
    }, [redoStack, code]);

    const handleSave = useCallback(async () => {
        if (!diagramId) return;

        setSaving(true);
        await storage.updateDiagram(diagramId, {
            content: code,
            title,
            type: diagramLanguage,
            updatedAt: Date.now(),
        });
        setSaving(false);
    }, [diagramId, code, title, diagramLanguage]);

    const isDefaultDiagram = useCallback((content: string) => {
        return content.trim() === DEFAULT_CODE.trim();
    }, []);

    const loadDiagram = useCallback(async () => {
        setLoading(true);
        if (diagramId) {
            const diagrams = await storage.getDiagrams();
            const diagram = diagrams.find(d => d.id === diagramId);
            if (diagram) {
                setCode(diagram.content);
                setTitle(diagram.title);
                setDiagramLanguage(diagram.type === 'plantuml' ? 'plantuml' : 'mermaid');
                setDiagramMetadata(diagram.metadata || null);
            }
        } else {
            // Check for pending import from context menu
            try {
                const storageData = await chrome.storage.local.get('pending_import');
                if (storageData.pending_import) {
                    const { diagram, structure, extraContext, timestamp } = storageData.pending_import;
                    // Only use if recent (within 5 minutes)
                    if (Date.now() - timestamp < 5 * 60 * 1000) {
                        console.log('DevCanvas: Found pending import, applying...');
                        setCode(diagram);
                        setDiagramMetadata({
                            repoStructure: Array.isArray(structure)
                                ? structure.map((s: any) => `${s.type === 'dir' ? '/' : ''}${s.name}`).join('\n')
                                : (structure || ''),
                            extraContext: extraContext || ''
                        });
                        // Clear storage after use
                        chrome.storage.local.remove('pending_import');
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn('DevCanvas: Failed to check pending_import', e);
            }

            // New diagram
            const newDiagram = await storage.addDiagram({
                title: 'Untitled Diagram',
                content: DEFAULT_CODE,
                type: 'mermaid',
                tags: [],
            });
            setCode(newDiagram.content);
            setTitle(newDiagram.title);
        }
        setLoading(false);
    }, [diagramId]);

    const syncVisualToCode = useCallback(
        (nodes: Node[], edges: Edge[]) => {
            const newCode = MermaidConverter.toMermaid(nodes as unknown as FlowNode[], edges as FlowEdge[]);
            if (newCode !== code) {
                setCode(newCode);
                // Don't auto-save immediately on drag to avoid spam, let the auto-save effect handle it
            }
        },
        [code] // Depend on code to avoid loops? No, if we generate new code, we set it.
    );

    const handleDelete = useCallback(() => {
        pushToHistory(code);
        if (selectedNode) {
            const newNodes = flowNodes.filter(n => n.id !== selectedNode.id);
            setFlowNodes(newNodes);
            syncVisualToCode(newNodes, flowEdges);
            setSelectedNode(null);
            setShowStylePanel(false);
        } else if (selectedEdge) {
            const newEdges = flowEdges.filter(e => e.id !== selectedEdge.id);
            setFlowEdges(newEdges);
            syncVisualToCode(flowNodes, newEdges);
            setSelectedEdge(null);
            setShowStylePanel(false);
        }
    }, [code, flowNodes, flowEdges, selectedNode, selectedEdge, syncVisualToCode, pushToHistory]);

    // Keyboard Shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, redoStack, code, handleUndo, handleRedo]);

    // Delete shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editorMode === 'visual' && (e.key === 'Delete' || e.key === 'Backspace')) {
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
                handleDelete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editorMode, flowNodes, flowEdges, selectedNode, selectedEdge, handleDelete]);

    useEffect(() => {
        // Don't reload diagram if a tour is active
        if (isTourActive) return;
        loadDiagram();
    }, [diagramId, loadDiagram, isTourActive]);

    // Auto-save every 2 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (diagramId && code) {
                handleSave();
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [code, title, diagramId, handleSave]);



    // ... (existing imports)

    const handleFolderAudit = async (folderName: string) => {
        if (!diagramMetadata?.repoStructure) {
            alert('This diagram does not have repository context. Interactive audits are only available for repository maps.');
            return;
        }

        try {
            const aiService = await import('../../utils/aiService');
            setAiMessage(`Genie is auditing folder: ${folderName}...`);
            setAiProcessing(true);

            // 1. Analyze scoped structure
            let structureToAnalyze = diagramMetadata.repoStructure as string;

            // Try to scope it
            const root = parseRepoStructure(structureToAnalyze);
            if (root) {
                const map = buildStructureMap(root);
                // Try exact match or relative match
                // folderName might be "src/utils" or just "utils"
                let targetNode = map.get(folderName);

                // If not found, try to find by ID suffix (e.g. user typed "src/utils" but ID is "root/src/utils")
                if (!targetNode) {
                    for (const node of map.values()) {
                        if (node.id.endsWith(`/${folderName}`) || node.id === folderName) {
                            targetNode = node;
                            break;
                        }
                    }
                }

                if (targetNode) {
                    structureToAnalyze = stringifyStructNode(targetNode);
                }
            }

            // CRITICAL: Use the full node path (id) for context filtering, not just the label
            const filterPath = (root && buildStructureMap(root).get(folderName)?.id) || folderName;
            const filteredContext = filterContextByFolder(diagramMetadata.extraContext as string, filterPath);

            const aiContent = await aiService.analyzeFolderIssues(
                folderName,
                structureToAnalyze,
                await storage.getSettings(),
                filteredContext
            );

            setAiProcessing(false);

            if (aiContent) {
                const doc = await storage.addDocument({
                    title: `Audit: ${folderName}`,
                    content: aiContent,
                    tags: ['github', 'audit', 'folder']
                });

                onOpenDocument(doc.id);
            }
        } catch (err: unknown) {
            setAiProcessing(false);
            const errorMessage = err instanceof Error ? err.message : String(err);
            alert(`Folder audit failed: ${errorMessage}`);
        }
    };


    const handleEnhanceWithAI = () => {
        setAiInstruction('');
        setShowAIModal(true);
    };

    // Drag & Drop handler for AI prompt to support @folder scoping via GitHub links
    const handleDropOnAI = (e: React.DragEvent) => {
        e.preventDefault();
        const url = e.dataTransfer.getData('text/plain');
        if (url && url.includes('github.com')) {
            try {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/').filter(Boolean);
                // URL: /user/repo/tree/branch/path/to/folder or /user/repo/blob/branch/path/to/file
                if (pathParts.length >= 5 && (pathParts[2] === 'tree' || pathParts[2] === 'blob')) {
                    const relativePath = pathParts.slice(4).join('/');
                    if (relativePath) {
                        setAiInstruction(prev => {
                            const trimmed = prev.trim();
                            return trimmed ? `${trimmed} @${relativePath}` : `@${relativePath}`;
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to parse dropped URL:', err);
            }
        }
    };

    // Helper to filter global context by folder to prevent noise in scoped audits
    const filterContextByFolder = (context: string, targetFolderPath: string) => {
        if (!context) return undefined;

        // Normalize target path (remove leading/trailing slashes)
        const targetDir = targetFolderPath.replace(/^\/+|\/+$/g, '');

        const blocks = context.split('\n--- CONTENT OF ');
        const filteredBlocks = blocks.filter(block => {
            if (!block.trim()) return false;

            // Extract the path from (path/to/file)
            // Format match: TAG (path/to/file)
            const pathMatch = block.match(/\(([^)]+)\)/);
            if (!pathMatch) return false;

            const filePath = pathMatch[1].replace(/^\/+|\/+$/g, '');

            // 1. Keep explicit root config files for high-level context
            const isImportantRootFile = ['package.json', 'go.mod', 'requirements.txt', 'README.md', 'tsconfig.json'].includes(filePath);
            if (isImportantRootFile) return true;

            // 2. Check if file is strictly inside the target folder
            // e.g. targetDir="src/utils" matches "src/utils/api.ts"
            const isInFolder = filePath === targetDir || filePath.startsWith(targetDir + '/');
            return isInFolder;
        });

        console.log(`DevCanvas Scoping: Filtered ${blocks.length} context blocks down to ${filteredBlocks.length} relative to "${targetDir}"`);

        if (filteredBlocks.length === 0) return undefined;
        // Reconstruct with original prefix and proper joining
        return filteredBlocks.map(b => (b.trim().startsWith('---') ? b : '--- CONTENT OF ' + b)).join('\n');
    };

    const executeEnhancement = async () => {
        try {
            setSaving(true); // Show loading state on button
            setAiMessage(aiMode === 'logic-flow' ? 'Genie is mapping logic paths...' : aiMode === 'code-import' ? 'Analyzing structure...' : 'Polishing diagram...');
            setAiProcessing(true);

            const settings = await storage.getSettings();

            if (!settings.apiKeys?.[settings.aiProvider || 'openai'] && !settings.apiKey) {
                alert('Please configure an API Key in Settings first.');
                setSaving(false);
                return;
            }

            const originalCode = aiMode === 'code-import' || aiMode === 'logic-flow' || aiMode === 'tour' ? '' : code;

            let instruction = aiInstruction;
            let enhancedCode = '';

            const aiService = await import('../../utils/aiService');

            if (aiMode === 'tour') {
                // Try to get repository context from current tab if not in diagram metadata
                let repoContext = diagramMetadata?.repoStructure as string | undefined;
                let repoUrl = '';
                let extraContext = diagramMetadata?.extraContext as string | undefined;

                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!repoContext) {
                    // Fetch current tab URL to extract GitHub repo
                    try {
                        if (tab?.url) {
                            const match = tab.url.match(/github\.com\/([^/]+)\/([^/]+)/);
                            if (match) {
                                repoUrl = `${match[1]}/${match[2]}`;
                                setAiMessage(`Detected repository: ${repoUrl}. Mapping structure...`);

                                // Send message to tab to get structure
                                try {
                                    const response = await chrome.tabs.sendMessage(tab.id!, {
                                        type: MessageType.ANALYZE_REPO,
                                        target: 'content-script'
                                    });
                                    if (response.success && response.data) {
                                        repoContext = response.data.structure.map((s: any) => `${s.type === 'dir' ? '/' : ''}${s.name}`).join('\n');
                                        extraContext = response.data.extraContext as string | undefined;
                                    }
                                } catch (msgErr) {
                                    console.warn('Failed to sendMessage to tab for structure', msgErr);
                                }
                            } else {
                                alert('Please open a GitHub repository page to use Tour mode.');
                                setAiProcessing(false);
                                return;
                            }
                        } else {
                            alert('Could not detect current tab. Please open a GitHub repository.');
                            setAiProcessing(false);
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to get current tab:', e);
                        alert('Failed to detect repository context.');
                        setAiProcessing(false);
                        return;
                    }
                }

                // track current working state locally to avoid stale closure issues
                let currentWorkingCode = code;
                let currentWorkingNodes = flowNodes;
                let currentWorkingEdges = flowEdges;

                // SMART INITIALIZATION: If current diagram is default, force visualize repo first
                if (isDefaultDiagram(currentWorkingCode) && repoContext) {
                    setAiMessage(`Mapping out the components for your tour: "${aiInstruction}"...`);
                    try {
                        const repoDiagram = await aiService.visualizeRepository(
                            repoContext as string,
                            settings,
                            'graph TD',
                            `Generate a specific architecture diagram focusing ONLY on the components and flows related to: ${aiInstruction}. This will serve as the map for an interactive code tour.`,
                            extraContext || undefined
                        );
                        if (repoDiagram) {
                            currentWorkingCode = repoDiagram;
                            setCode(repoDiagram);
                            // Set metadata so it's remembered
                            setDiagramMetadata({
                                repoStructure: repoContext,
                                extraContext: extraContext || ''
                            });
                            // Convert immediately so we have nodes for the tour
                            const { nodes, edges } = MermaidConverter.toReactFlow(repoDiagram);
                            currentWorkingNodes = nodes;
                            currentWorkingEdges = edges;
                            setFlowNodes(nodes);
                            setFlowEdges(edges);
                            console.log('✅ Auto-initialization complete, nodes:', nodes.length);
                        }
                    } catch (vizErr) {
                        console.error('Auto-visualization failed', vizErr);
                    }
                }

                const availableNodes = currentWorkingNodes.map(n => ({
                    id: n.id,
                    label: (n.data?.label as string) || n.id,
                    type: n.type
                }));

                setAiMessage('Genie is planning the tour route...');

                try {
                    const steps = await generateCodeTour(
                        aiInstruction,
                        availableNodes,
                        settings,
                        {
                            pineconeApiKey: settings.apiKeys?.pinecone,
                            repoUrl: repoUrl
                        }
                    );

                    if (steps && steps.length > 0) {
                        // Auto-switch to Visual mode if in Code mode
                        const wasInCodeMode = editorMode === 'code';
                        let nodesToUse = currentWorkingNodes;
                        let edgesToUse = currentWorkingEdges;

                        if (wasInCodeMode) {
                            console.log('📐 Auto-switching to Visual mode for tour');
                            setEditorMode('visual');

                            // Manually convert code to nodes immediately
                            console.log('🔨 Manually converting code to visual nodes...');
                            try {
                                const { nodes, edges } = MermaidConverter.toReactFlow(currentWorkingCode);
                                nodesToUse = nodes;
                                edgesToUse = edges;
                                // Update state with converted nodes
                                setFlowNodes(nodes);
                                setFlowEdges(edges);
                                console.log('✅ Converted', nodes.length, 'nodes');
                            } catch (error) {
                                console.error('Failed to convert code to nodes:', error);
                                alert('Failed to convert diagram to visual mode. Please try again.');
                                setAiProcessing(false);
                                return;
                            }
                        }

                        // Debug logging
                        console.log('🎯 Tour Starting - Current State:');
                        console.log('  - Code length:', code.length);
                        console.log('  - Nodes to use:', nodesToUse.length);
                        console.log('  - Editor Mode:', editorMode, '→', wasInCodeMode ? 'visual' : editorMode);
                        console.log('  - Code preview:', code.substring(0, 100));

                        // Snapshot current diagram state before starting tour
                        setPreTourSnapshot({
                            nodes: nodesToUse,
                            edges: edgesToUse,
                            code: code,
                            editorMode: editorMode  // Save original mode
                        });
                        console.log('  - Snapshot created with', nodesToUse.length, 'nodes');

                        setTourSteps(steps);
                        setCurrentTourStep(0);
                        setIsTourActive(true);
                        setShowAIModal(false);
                        setNotification({
                            message: wasInCodeMode
                                ? 'Tour started! (Switched to Visual mode)'
                                : 'Tour started!',
                            type: 'success'
                        });
                    } else {
                        alert('Could not generate a valid tour path. Please try a different query.');
                    }
                } catch (e) {
                    console.error('Tour generation failed', e);
                    alert('Failed to generate tour.');
                }
                setAiProcessing(false);
                return;
            }

            if (aiMode === 'logic-flow') {

                enhancedCode = await aiService.visualizeLogicFlow(aiInstruction, settings);
            } else {
                // 1. Check for Manual Audit/Diagram Scoping Commands OR @folder Mentions
                let scopedStructureMatch: { type: 'audit' | 'diagram', folder: string } | null = null;

                if (aiMode === 'instruction') {
                    // Detect @folder mentions anywhere in the prompt
                    const mentionMatch = aiInstruction.match(/@(["']?([^"'\s]+)["']?)/);

                    // Improved Regex to handle trailing spaces/text and ensure robust capture
                    const auditRegex = /^(?:audit|analyze|check)\s+(?:folder|component|path)?\s*["']?([^"']+)["']?/i;
                    // Diagram regex now skips potential qualifiers like "health of" or "flow of" when capturing the folder name
                    const diagramRegex = /^(?:diagram|visualize|map)\s+(?:health|flow|logic flow|logic|map|structure)?\s*(?:of|in)?\s*(?:folder|component|path)?\s*["']?([^"']+)["']?/i;

                    const auditMatch = aiInstruction.match(auditRegex);
                    const diagramMatch = aiInstruction.match(diagramRegex);

                    if (mentionMatch) {
                        // If @mention found, use it for scoping regardless of command
                        scopedStructureMatch = { type: 'diagram', folder: mentionMatch[2] };
                        // If the text also contains "audit" or "analyze", adjust type/instruction
                        if (aiInstruction.toLowerCase().includes('audit') || aiInstruction.toLowerCase().includes('analyze')) {
                            scopedStructureMatch.type = 'audit';
                        }
                    } else if (auditMatch && auditMatch[1]) {
                        scopedStructureMatch = { type: 'audit', folder: auditMatch[1].trim() };
                    } else if (diagramMatch && diagramMatch[1]) {
                        scopedStructureMatch = { type: 'diagram', folder: diagramMatch[1].trim() };
                    }
                }

                if (scopedStructureMatch && diagramMetadata?.repoStructure) {
                    // Parse and Scope
                    const root = parseRepoStructure(diagramMetadata.repoStructure as string);
                    if (root) {
                        const map = buildStructureMap(root);
                        let targetNode = map.get(scopedStructureMatch.folder);

                        // Robust Lookup
                        if (!targetNode) {
                            for (const node of map.values()) {
                                if (node.id.endsWith(`/${scopedStructureMatch.folder}`) || node.id === scopedStructureMatch.folder) {
                                    targetNode = node;
                                    break;
                                }
                            }
                        }

                        if (targetNode) {
                            const scopedStructure = stringifyStructNode(targetNode);
                            // Filter context to only include files in this folder (plus root README/configs)
                            const filteredContext = filterContextByFolder(diagramMetadata.extraContext as string, targetNode.id);

                            if (scopedStructureMatch.type === 'audit') {
                                // Execute Audit
                                const aiContent = await aiService.analyzeFolderIssues(
                                    scopedStructureMatch.folder,
                                    scopedStructure,
                                    settings,
                                    filteredContext
                                );

                                setAiProcessing(false);
                                setSaving(false);
                                setShowAIModal(false);

                                if (aiContent) {
                                    const doc = await storage.addDocument({
                                        title: `Audit: ${scopedStructureMatch.folder}`,
                                        content: aiContent,
                                        tags: ['github', 'audit', 'folder']
                                    });
                                    onOpenDocument(doc.id);
                                }
                                return; // Exit, handled as document open
                            } else {
                                // Execute Diagram (Visualize Repository)
                                const isHealthMap = scopedStructureMatch.type === 'diagram' &&
                                    (aiInstruction.toLowerCase().includes('health') || aiInstruction.toLowerCase().includes('audit'));

                                const isLogicFlow = scopedStructureMatch.type === 'diagram' &&
                                    (aiInstruction.toLowerCase().includes('flow') || aiInstruction.toLowerCase().includes('logic'));

                                if (isLogicFlow) {
                                    enhancedCode = await aiService.visualizeLogicFlow(
                                        `Visualize the logic flow of ${scopedStructureMatch.folder}`,
                                        settings,
                                        scopedStructure,
                                        filteredContext
                                    );
                                    setDiagramLanguage('mermaid');
                                } else {
                                    enhancedCode = await aiService.visualizeRepository(
                                        scopedStructure,
                                        settings,
                                        diagramLanguage === 'mermaid' ? 'graph TD' : 'plantuml', // Default layout
                                        `Focus on the ${scopedStructureMatch.folder} folder. ${aiInstruction}`,
                                        filteredContext,
                                        isHealthMap
                                    );
                                }
                            }
                        } else {
                            alert(`Folder "${scopedStructureMatch.folder}" not found in repository structure.`);
                        }
                    }
                }

                if (!enhancedCode) {
                    if (aiMode === 'code-import') {
                        instruction = `Analyze the following code snippet and generate a comprehensive Mermaid diagram (e.g. Class Diagram for JSON/Classes, ERD for SQL) that represents the relationships and structure. \n\nIMPORTANT: Return ONLY the Mermaid code. \n\nCode Snippet:\n${aiInstruction}`;
                    }
                    enhancedCode = await aiService.enhanceDiagram(originalCode, diagramLanguage, settings, instruction);
                }
            }

            if (enhancedCode) {
                pushToHistory(code);
                setCode(enhancedCode);
                if (aiMode === 'logic-flow') {
                    setDiagramLanguage('mermaid');
                }
                handleSave();
                setShowAIModal(false);
            }
            setAiProcessing(false);
        } catch (err: unknown) {
            console.error('AI Enhancement Callback Error:', err);
            setAiProcessing(false);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage || 'Failed to enhance diagram');
        } finally {
            setSaving(false);
        }
    };


    const handleExport = async (format: 'png' | 'svg', transparent: boolean = false) => {
        setNotification({ message: 'Preparing download...', type: 'success' });

        await new Promise(resolve => setTimeout(resolve, 200));

        let container: HTMLElement | null = null;
        const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'diagram';

        if (editorMode === 'visual') {
            container = window.document.querySelector('.react-flow__viewport') as HTMLElement;
        } else {
            container = window.document.querySelector('.mermaid-container') as HTMLElement;
        }

        if (!container) {
            setNotification({ message: 'Could find diagram to export.', type: 'error' });
            return;
        }

        try {
            const filterNode = (node: HTMLElement) => {
                const cls = node.classList;
                if (cls?.contains('react-flow__controls')) return false;
                if (cls?.contains('react-flow__handle')) return false;
                if (cls?.contains('react-flow__attribution')) return false;
                if (cls?.contains('edge-placeholder')) return false;
                return true;
            };

            const bgColorToUse = transparent ? 'transparent' : (editorMode === 'visual' ? bgColor : '#0d1117');

            if (editorMode === 'visual') {
                // Get full bounds of all nodes
                const nodesBounds = getRectOfNodes(flowNodes);

                const exportOptions = {
                    backgroundColor: bgColorToUse,
                    filter: filterNode as (node: HTMLElement) => boolean,
                    width: nodesBounds.width + 100,
                    height: nodesBounds.height + 100,
                    style: {
                        width: `${nodesBounds.width + 100}px`,
                        height: `${nodesBounds.height + 100}px`,
                        transform: `translate(${-nodesBounds.x + 50}px, ${-nodesBounds.y + 50}px)`,
                    },
                };

                if (format === 'png') {
                    const dataUrl = await toPng(container, { ...exportOptions, pixelRatio: 2 });
                    const link = window.document.createElement('a');
                    link.download = `${filename}${transparent ? '_transparent' : ''}.png`;
                    link.href = dataUrl;
                    link.click();
                } else {
                    const { toSvg } = await import('html-to-image');
                    const dataUrl = await toSvg(container, exportOptions);
                    const link = window.document.createElement('a');
                    link.download = `${filename}${transparent ? '_transparent' : ''}.svg`;
                    link.href = dataUrl;
                    link.click();
                }
            } else {
                // Mermaid Export (Simplified)
                // Mermaid Export (Simplified)
                if (format === 'png') {
                    // Calculate full dimensions to avoid cropping
                    const width = container.scrollWidth;
                    const height = container.scrollHeight;

                    const dataUrl = await toPng(container, {
                        backgroundColor: bgColorToUse,
                        filter: filterNode as (node: HTMLElement) => boolean,
                        pixelRatio: 3, // Increased for sharpness
                        width: width,
                        height: height,
                        style: {
                            // meaningful for html-to-image to ensure it captures full content
                            width: `${width}px`,
                            height: `${height}px`,
                        }
                    });
                    const link = window.document.createElement('a');
                    link.download = `${filename}.png`;
                    link.href = dataUrl;
                    link.click();
                } else {
                    const svgElement = container.querySelector('svg');
                    if (svgElement) {
                        const svgData = new XMLSerializer().serializeToString(svgElement);
                        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = window.document.createElement('a');
                        link.download = `${filename}.svg`;
                        link.href = url;
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                }
            }
            setNotification({ message: 'Export complete!', type: 'success' });
        } catch (err) {
            console.error('Export failed:', err);
            setNotification({ message: 'Export failed.', type: 'error' });
        }
    };

    const handleCopyToClipboard = async () => {
        let container: HTMLElement | null = null;
        if (editorMode === 'visual') {
            container = window.document.querySelector('.react-flow') as HTMLElement;
        } else {
            container = window.document.querySelector('.mermaid-container') as HTMLElement;
        }

        if (!container) return;

        try {
            const filterNode = (node: HTMLElement) => {
                if (node.classList?.contains('react-flow__controls')) return false;
                if (node.classList?.contains('react-flow__handle')) return false;
                if (node.classList?.contains('react-flow__attribution')) return false;
                return true;
            };

            // Generate transparent PNG for clipboard
            const dataUrl = await toPng(container, {
                backgroundColor: 'transparent',
                filter: filterNode,
                pixelRatio: 2
            });

            // Convert dataUrl to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            // Copy to clipboard
            const item = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([item]);

            setNotification({ message: 'Transparent PNG copied to clipboard!', type: 'success' });
        } catch (err) {
            console.error('Copy failed:', err);
            setNotification({ message: 'Copy failed. Browser may not support image direct copy.', type: 'error' });
        }
    };

    const handleCopyJson = () => {
        try {
            const diagramData = {
                title,
                language: diagramLanguage,
                code,
                visual: editorMode === 'visual' ? {
                    nodes: flowNodes,
                    edges: flowEdges,
                    background: { color: bgColor, pattern: bgPattern }
                } : null
            };

            navigator.clipboard.writeText(JSON.stringify(diagramData, null, 2));
            setNotification({ message: 'Diagram data (JSON) copied!', type: 'success' });
        } catch (err) {
            console.error('JSON Copy failed:', err);
            setNotification({ message: 'JSON Copy failed.', type: 'error' });
        }
    };

    const handleLanguageChange = (lang: 'mermaid' | 'plantuml') => {
        setDiagramLanguage(lang);
        if (code === DEFAULT_CODE || code.includes('@startuml')) {
            if (lang === 'plantuml') {
                setCode(`@startuml\nAlice -> Bob: Hello\nBob --> Alice: Hi!\n@enduml`);
                setEditorMode('code'); // PlantUML only supports code mode
            } else {
                setCode(DEFAULT_CODE);
            }
        }
        pushToHistory(code);
    };

    const handleNodeSelect = (nodeId: string, position: { x: number; y: number }) => {
        let cleanId = nodeId;
        const parts = nodeId.split('-');
        if (parts.length > 1) {
            cleanId = parts.find(p => code.includes(`${p}[`) || code.includes(`${p}(`) || code.includes(`${p}{`)) || nodeId;
        }

        const nodeRegex = new RegExp(`(${cleanId})\\s*(\\[|\\(|\\{\\{|\\{)([^\\]\\)\\}]+)`);
        const match = code.match(nodeRegex);
        const currentText = match && match[3] ? match[3] : '';

        setSelectedNode({
            id: cleanId,
            text: currentText,
            position
        });
    };

    const getAvailableNodes = (): string[] => {
        if (editorMode === 'visual') {
            return flowNodes.map(n => n.id).sort();
        }
        const nodeRegex = /([A-Za-z0-9_.-]+)\s*[( [{]/g;
        const matches = code.matchAll(nodeRegex);
        const nodes = new Set<string>();
        for (const match of matches) {
            nodes.add(match[1]);
        }
        return Array.from(nodes).sort();
    };

    const handleArrowCreate = (from: string, to: string, label: string, style: string, color?: string) => {
        if (editorMode === 'visual') {
            // We update flowEdges
            const edgeColor = color || '#0ea5e9';
            const newEdge: Edge = {
                id: `${from}-${to}-${Date.now()}`,
                source: from,
                target: to,
                label: label,
                type: 'editable',
                style: { stroke: edgeColor, strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor,
                },
                data: { originalArrow: style === 'solid' ? '-->' : style === 'dotted' ? '-.->' : '==>' }
            };
            const newEdges = [...flowEdges, newEdge];
            setFlowEdges(newEdges);
            syncVisualToCode(flowNodes, newEdges);
        } else {
            const arrowMap: Record<string, string> = {
                'solid': '-->',
                'dotted': '-.->',
                'thick': '==>',
                'open': '---'
            };
            const arrowSymbol = arrowMap[style] || '-->';
            const labelPart = label ? `|${label}|` : '';
            const newArrow = `    ${from} ${arrowSymbol}${labelPart} ${to}`;

            const lines = code.split('\n');
            let insertIndex = lines.length;
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim() && !lines[i].includes('@enduml')) {
                    insertIndex = i + 1;
                    break;
                }
            }
            lines.splice(insertIndex, 0, newArrow);
            setCode(lines.join('\n'));
        }
    };

    const handleNodeUpdate = (nodeId: string, updates: { text?: string; shape?: string; color?: string; strokeStyle?: string; strokeColor?: string; handleColor?: string; textColor?: string; imageUrl?: string; strokeWidth?: number; groupShape?: string; labelBgColor?: string }) => {
        pushToHistory(code);
        if (editorMode === 'visual') {
            // Visual Mode Update
            const newNodes = flowNodes.map(node => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        type: updates.shape || node.type,
                        zIndex: node.zIndex, // Preserve z-index
                        style: node.style, // Preserve style (including z-index in style)
                        data: {
                            ...node.data,
                            label: updates.text === undefined ? node.data.label : updates.text,
                            color: updates.color || node.data.color,
                            strokeColor: updates.strokeColor || node.data.strokeColor,
                            strokeStyle: updates.strokeStyle || node.data.strokeStyle,
                            handleColor: updates.handleColor || node.data.handleColor,
                            textColor: updates.textColor || node.data.textColor,
                            imageUrl: updates.imageUrl === undefined ? node.data.imageUrl : updates.imageUrl,
                            strokeWidth: updates.strokeWidth || node.data.strokeWidth,
                            groupShape: updates.groupShape || node.data.groupShape,
                            labelBgColor: updates.labelBgColor || node.data.labelBgColor
                        }
                    };
                }
                return node;
            });
            setFlowNodes(newNodes);
            syncVisualToCode(newNodes, flowEdges);

            // Update selected node state to reflect changes immediately in the panel
            const updatedNode = newNodes.find(n => n.id === nodeId);
            if (updatedNode) {
                setSelectedNode({
                    id: updatedNode.id,
                    text: updatedNode.data.label,
                    position: updatedNode.position,
                    color: updatedNode.data.color,
                    shape: updatedNode.type,
                    strokeColor: updatedNode.data.strokeColor,
                    strokeStyle: updatedNode.data.strokeStyle,
                    handleColor: updatedNode.data.handleColor,
                    textColor: updatedNode.data.textColor,
                    imageUrl: updatedNode.data.imageUrl,
                    strokeWidth: updatedNode.data.strokeWidth,
                    groupShape: updatedNode.data.groupShape,
                    labelBgColor: updatedNode.data.labelBgColor,
                    parentNode: updatedNode.parentNode
                } as unknown as { id: string; text: string; position: { x: number; y: number } });
            }
        } else {
            // Code Mode Update (Regex)
            let newCode = code;

            if (updates.text) {
                const defRegex = new RegExp(`(${nodeId}\\s*)(\\[|\\(\\(|\\(|\\{\\{|\\{>|\\{)(.*?)(\\]|\\)\\)|\\)|\\}\\}|\\}|\\>)`);
                newCode = newCode.replace(defRegex, (_match, prefix, open, _content, close) => {
                    return `${prefix}${open}${updates.text}${close}`;
                });
            }

            if (updates.shape) {
                let open = '[', close = ']';
                switch (updates.shape) {
                    case 'rounded': open = '('; close = ')'; break;
                    case 'circle': open = '(('; close = '))'; break;
                    case 'diamond': open = '{'; close = '}'; break;
                    default: open = '['; close = ']'; break;
                }
                const shapeRegex = new RegExp(`(${nodeId}\\s*)(\\[|\\(\\(|\\(|\\{\\{|\\{>|\\{)(.*?)(\\]|\\)\\)|\\)|\\}\\}|\\}|\\>)`);
                newCode = newCode.replace(shapeRegex, (_match, prefix, _oldOpen, content, _oldClose) => {
                    return `${prefix}${open}${content}${close}`;
                });
            }

            if (updates.color || updates.strokeStyle || updates.strokeColor) {
                const styleRegex = new RegExp(`style\\s+${nodeId}\\s+.*`);
                const stroke = updates.strokeColor || '#333';
                let styleDef = `fill:${updates.color || '#333'},stroke:${stroke},stroke-width:2px,color:#fff`;

                if (updates.strokeStyle === 'dashed') styleDef += ',stroke-dasharray: 5 5';
                else if (updates.strokeStyle === 'dotted') styleDef += ',stroke-dasharray: 1 2';
                else styleDef += ',stroke-dasharray: 0';

                const styleString = `style ${nodeId} ${styleDef}`;
                if (styleRegex.test(newCode)) {
                    newCode = newCode.replace(styleRegex, styleString);
                } else {
                    newCode += `\n${styleString}`;
                }
            }
            setCode(newCode);
            handleSave();
        }
    };

    const handleEdgeUpdate = (edgeId: string, updates: { label?: string; color?: string; style?: string; labelColor?: string; labelBg?: string }) => {
        pushToHistory(code);
        if (editorMode === 'visual') {
            // Visual Mode Update
            const newEdges = flowEdges.map(edge => {
                if (edge.id === edgeId) {
                    const updatedEdge: Edge = {
                        ...edge,
                        label: updates.label !== undefined ? updates.label : edge.label,
                        style: {
                            ...edge.style,
                            stroke: updates.color || edge.style?.stroke || '#0ea5e9',
                            strokeWidth: edge.style?.strokeWidth || 2
                        },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: updates.color || (edge.markerEnd as { color?: string })?.color || '#0ea5e9',
                        },
                        labelStyle: {
                            fill: updates.labelColor || (edge as unknown as { labelStyle?: { fill?: string } }).labelStyle?.fill || '#ffffff',
                            fontWeight: 600,
                            fontSize: 14,
                        },
                        labelBgStyle: {
                            fill: updates.labelBg || (edge as unknown as { labelBgStyle?: { fill?: string } }).labelBgStyle?.fill || 'transparent',
                        },
                        labelBgPadding: [8, 4],
                        labelBgBorderRadius: 4,
                    };
                    return updatedEdge;
                }
                return edge;
            });
            setFlowEdges(newEdges);
            syncVisualToCode(flowNodes, newEdges);

            // Update selected edge state
            const updatedEdge = newEdges.find(e => e.id === edgeId);
            if (updatedEdge) {
                setSelectedEdge(updatedEdge);
            }
        }
    };

    // React Flow conversion - from Code to Visual
    useEffect(() => {
        console.log('🔄 Code-to-Visual Effect Triggered:', {
            isTourActive,
            hasSnapshot: !!preTourSnapshot,
            codeLength: code.length,
            editorMode,
            diagramLanguage
        });

        // If tour just became active and we have a snapshot, restore it
        if (isTourActive && preTourSnapshot) {
            console.log('✅ Restoring from snapshot:', preTourSnapshot.nodes.length, 'nodes');
            setFlowNodes(preTourSnapshot.nodes);
            setFlowEdges(preTourSnapshot.edges);
            return;
        }

        // Don't convert during active tour to preserve diagram state
        if (isTourActive) {
            console.log('⏸️  Skipping conversion - tour is active');
            return;
        }

        if (editorMode === 'visual' && diagramLanguage === 'mermaid') {
            try {
                console.log('🔨 Converting code to visual');
                const { nodes, edges } = MermaidConverter.toReactFlow(code);
                // JSON stringify to compare deeply? Or just set it. 
                // Setting it triggers handleFlowNodesChange which triggers syncVisualToCode which checks for diff.
                // To avoid loop, syncVisualToCode must be robust.
                setFlowNodes(nodes);
                setFlowEdges(edges);
            } catch (error) {
                console.error('Failed to convert Mermaid to React Flow:', error);
            }
        }
    }, [editorMode, diagramLanguage, code, isTourActive, preTourSnapshot]);

    // Sync visual changes to code
    const handleFlowNodesChange = useCallback((nodes: Node[]) => {
        setFlowNodes(nodes);

    }, []);

    // Effect to debounce sync
    useEffect(() => {
        if (editorMode === 'visual' && !isTourActive) {
            const timer = setTimeout(() => {
                const newCode = MermaidConverter.toMermaid(flowNodes as unknown as FlowNode[], flowEdges as unknown as FlowEdge[]);
                if (newCode !== code) {
                    setCode(newCode); // Update code state
                }
            }, 500);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [flowNodes, flowEdges, editorMode, code]);

    const handleFlowEdgesChange = (edges: Edge[]) => {
        setFlowEdges(edges);
    };


    const toggleFolderExpansion = (node: Node) => {
        if (!diagramMetadata?.repoStructure || editorMode !== 'visual') return;

        // 1. Parse Structure
        // TODO: Memoize this if performance is an issue, but for now it's fine on click.
        const root = parseRepoStructure(diagramMetadata.repoStructure as string);
        if (!root) return;
        const map = buildStructureMap(root);

        // 2. Find clicked node in structure
        // Node label usually matches folder name.
        const label = node.data.label;
        // Clean label (remove HTML if any, though usually clean)
        const cleanLabel = label.replace(/<[^>]*>/g, '').trim();

        const fileNode: FileNode | undefined = map.get(cleanLabel);
        // Only expand if it's a folder and we found it
        if (!fileNode || fileNode.type !== 'folder') return;

        // 3. Check if children exist in flowNodes
        // We check if any node has this node as its "parent" in our logic (connected source)
        // Adjust logic: We identifying children by edge connection AND visual placement?
        // Better: We track them by ID convention or just structure.
        // Let's use the Structure to know what *should* be there.

        const childrenNames = fileNode.children.map((c: FileNode) => c.name);

        // Find existing nodes that match these children AND are connected to this node
        const existingChildren = flowNodes.filter(n => {
            // Check if node ID starts with parent ID (naming convention)
            // or check if edge exists.

            // Let's use edge check for robustness
            const isConnected = flowEdges.some(e => e.source === node.id && e.target === n.id);
            return isConnected && childrenNames.includes(n.data.label);
        });

        if (existingChildren.length > 0) {
            // COLLAPSE: Remove children and their descendants
            const nodesToRemove = new Set<string>();
            const getDescendants = (parentId: string) => {
                const children = flowNodes.filter(n => {
                    const isConnected = flowEdges.some(e => e.source === parentId && e.target === n.id);
                    return isConnected;
                });
                children.forEach(c => {
                    nodesToRemove.add(c.id);
                    getDescendants(c.id);
                });
            };

            // Only remove nodes that are actually part of the tree structure from this point
            // We use the fileNode children to be safe, but visual graph might have more.
            // Let's just remove immediate children found in the graph and their descendants.
            existingChildren.forEach(c => {
                nodesToRemove.add(c.id);
                getDescendants(c.id);
            });

            setFlowNodes(prev => prev.filter(n => !nodesToRemove.has(n.id)));
            setFlowEdges(prev => prev.filter(e => !nodesToRemove.has(e.source) && !nodesToRemove.has(e.target)));
            setNotification({ message: `Collapsed ${cleanLabel}`, type: 'success' });

        } else {
            // EXPAND: Add children
            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];

            const startX = node.position.x;
            const startY = node.position.y + 150; // 150px below
            const spacingX = 160; // Horizontal spacing

            // Center the children relative to parent?
            // width = (children.length - 1) * spacingX
            const totalWidth = (fileNode.children.length - 1) * spacingX;
            const startOffset = -totalWidth / 2;

            fileNode.children.forEach((child: FileNode, index: number) => {
                // simple ID generation
                const childId = `${node.id}-${child.name.replace(/[^a-zA-Z0-9]/g, '')}`;
                const isFolder = child.type === 'folder';

                const newNode: Node = {
                    id: childId,
                    type: isFolder ? 'rectangle' : 'rectangle', // Use same for now
                    position: {
                        x: startX + startOffset + (index * spacingX),
                        y: startY
                    },
                    data: {
                        label: child.name,
                        color: isFolder ? '#eab308' : '#3b82f6', // Yellow / Blue
                        strokeColor: isFolder ? '#ca8a04' : '#2563eb',
                        imageUrl: isFolder ? 'https://api.iconify.design/material-symbols:folder-open-rounded.svg?color=%23ffffff' : 'https://api.iconify.design/material-symbols:description-rounded.svg?color=%23ffffff',
                        imageSize: 30
                    },
                    // We do NOT set parentNode because we want them connected by edges, not contained.
                };

                newNodes.push(newNode);

                newEdges.push({
                    id: `${node.id}-${childId}`,
                    source: node.id,
                    target: childId,
                    type: 'smoothstep',
                    style: { stroke: '#64748b', strokeDasharray: '5 5' },
                    animated: true
                });
            });

            setFlowNodes(prev => [...prev, ...newNodes]);
            setFlowEdges(prev => [...prev, ...newEdges]);
            setNotification({ message: `Expanded ${cleanLabel}`, type: 'success' });
        }
    };

    const handleFlowNodeClick = (node: Node) => {
        if (isTourActive) return;

        // Try to toggle expansion first
        if (diagramMetadata?.repoStructure && node.data.imageUrl && node.data.imageUrl.includes('folder')) {
            toggleFolderExpansion(node);
            // Return early to avoid opening style panel? 
            // Maybe user wants to style it too.
            // Let's do both or prioritize expansion.
            // If we expanded/collapsed, maybe don't show panel immediately to allow rapid browsing.
            return;
        }

        setSelectedNode({
            id: node.id,
            text: node.data.label,
            position: node.position,
            color: node.data.color,
            shape: node.type,
            strokeColor: node.data.strokeColor,
            strokeStyle: node.data.strokeStyle,
            handleColor: node.data.handleColor,
            textColor: node.data.textColor,
            imageUrl: node.data.imageUrl,
            parentNode: node.parentNode
        } as SelectedNode);
        setSelectedEdge(null); // Clear edge selection
        setShowStylePanel(true);
    };

    const handleFlowEdgeClick = (edge: Edge) => {
        setSelectedEdge(edge);
        setSelectedNode(null); // Clear node selection
        setShowStylePanel(true);
    };


    const handleCreateGroup = () => {
        pushToHistory(code);
        if (editorMode === 'visual') {
            const newId = `group_${Date.now()}`;
            const newGroup: FlowNode = {
                id: newId,
                type: 'group',
                position: { x: 100, y: 100 },
                style: { width: 400, height: 300 },
                data: { label: 'New Group', strokeStyle: 'dashed' }
            };
            // Ensure group is added to the beginning so it renders behind?
            // Actually React Flow renders in order. Groups should be first (bottom).
            const newNodes = [newGroup, ...flowNodes];
            setFlowNodes(newNodes);
            syncVisualToCode(newNodes, flowEdges);
        } else {
            const groupSnippet = `\nsubgraph ${`group_${Date.now()}`} ["New Group"]\n    direction TB\n    \nend\n`;
            setCode(prev => prev + groupSnippet);
            handleSave();
        }
        setNotification({ message: 'Group Created', type: 'success' });
    };

    if (loading) {
        return (
            <div className="diagram-editor loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="diagram-editor">
            {aiProcessing && <AIProcessingOverlay message={aiMessage} />}
            <div className="editor-header">
                <button className="btn-back" onClick={onBack} style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}>
                    <ArrowLeft size={18} />
                    <span>Back</span>
                </button>
                <input
                    type="text"
                    className="doc-title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Diagram Title"
                    style={{ height: '36px' }}
                />
                <div className="editor-actions">
                    <select
                        className="language-selector"
                        value={diagramLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value as 'mermaid' | 'plantuml')}
                        title="Diagram Language"
                        style={{ height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #30363d', background: '#1c2128', color: '#8b949e' }}
                    >
                        <option value="mermaid">Mermaid</option>
                        <option value="plantuml">PlantUML</option>
                    </select>

                    {/* Mode Toggle in Header */}
                    {diagramLanguage === 'mermaid' && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: '#1c2128',
                            borderRadius: '6px',
                            padding: '2px',
                            border: '1px solid #30363d',
                            height: '36px',
                            boxSizing: 'border-box'
                        }}>
                            <button
                                onClick={() => {
                                    if (editorMode === 'visual') {
                                        // Sync before searching
                                        const newCode = MermaidConverter.toMermaid(flowNodes as unknown as FlowNode[], flowEdges as unknown as FlowEdge[]);
                                        setCode(newCode);
                                    }
                                    setEditorMode('code');
                                }}
                                style={{
                                    padding: '0 12px',
                                    height: '30px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: editorMode === 'code' ? '#00DC82' : 'transparent',
                                    color: editorMode === 'code' ? '#0d1117' : '#8b949e',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Code2 size={14} />
                                Code
                            </button>
                            <button
                                onClick={() => setEditorMode('visual')}
                                style={{
                                    padding: '0 12px',
                                    height: '30px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: editorMode === 'visual' ? '#00DC82' : 'transparent',
                                    color: editorMode === 'visual' ? '#0d1117' : '#8b949e',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Layers size={14} />
                                Visual
                            </button>
                        </div>
                    )}


                    <button
                        className="btn-templates"
                        onClick={() => setShowTemplateModal(true)}
                        title="Use a Template"
                        style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', background: '#1c2128', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e', cursor: 'pointer' }}
                    >
                        <LayoutTemplate size={18} />
                        Templates
                    </button>
                    <button
                        className="btn-group"
                        onClick={handleCreateGroup}
                        title="Create Group"
                        style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', background: '#1c2128', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e', cursor: 'pointer' }}
                    >
                        <Group size={18} />
                        Group
                    </button>
                    <button
                        className="btn-enhance"
                        onClick={handleEnhanceWithAI}
                        title="Enhance with AI"
                        style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}
                    >
                        <Sparkles size={18} />
                        Enhance
                    </button>
                    <DiagramStylePanel
                        selectedNode={selectedNode}
                        selectedEdge={selectedEdge}
                        onNodeUpdate={handleNodeUpdate}
                        onEdgeUpdate={handleEdgeUpdate}
                        onArrowCreate={handleArrowCreate}
                        onBackgroundChange={(color, pattern) => {
                            setBgColor(color);
                            setBgPattern(pattern);
                        }}
                        currentBackground={{ color: bgColor, pattern: bgPattern }}
                        availableNodes={getAvailableNodes()}
                        onFolderAudit={handleFolderAudit}

                        onDelete={handleDelete}
                        isOpen={showStylePanel}
                        onToggle={() => setShowStylePanel(!showStylePanel)}
                    />
                    <button
                        onClick={() => setShowCode(!showCode)}
                        title={showCode ? 'Hide Code' : 'Show Code'}
                        style={{
                            height: '36px',
                            width: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px',
                            borderRadius: '6px',
                            border: '1px solid #30363d',
                            background: '#1c2128',
                            color: '#8b949e',
                            cursor: 'pointer'
                        }}
                    >
                        {showCode ? <Eye size={18} /> : <Code2 size={18} />}
                    </button>
                    <button
                        onClick={handleCopyToClipboard}
                        title="Copy Transparent PNG to Clipboard"
                        onContextMenu={(e) => { e.preventDefault(); handleCopyJson(); }}
                        style={{
                            height: '36px',
                            width: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px',
                            borderRadius: '6px',
                            border: '1px solid #30363d',
                            background: '#1c2128',
                            color: '#8b949e',
                            cursor: 'pointer'
                        }}
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={() => handleExport('png')}
                        title="Export (Left-click: PNG, Right-click: Transparent PNG)"
                        onContextMenu={(e) => { e.preventDefault(); handleExport('png', true); }}
                        style={{
                            height: '36px',
                            width: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px',
                            borderRadius: '6px',
                            border: '1px solid #30363d',
                            background: '#1c2128',
                            color: '#8b949e',
                            cursor: 'pointer'
                        }}
                    >
                        <Download size={18} />
                    </button>
                    <button
                        className="btn-save"
                        onClick={handleSave}
                        disabled={saving}
                        title="Save (Auto-saves every 2s)"
                        style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Template Modal */}
            {
                showTemplateModal && (
                    <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <LayoutTemplate size={18} style={{ color: 'var(--brand-solid)' }} />
                                    <h3>Choose a Template</h3>
                                </div>
                            </div>
                            <div className="modal-body" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #30363d', display: 'flex', gap: '8px' }}>
                                    {['All', 'System Design', 'Database', 'Algorithms'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setTemplateCategory(cat)}
                                            style={{
                                                background: templateCategory === cat ? '#238636' : '#1c2128',
                                                color: templateCategory === cat ? '#fff' : '#8b949e',
                                                border: '1px solid #30363d',
                                                borderRadius: '20px',
                                                padding: '4px 12px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ padding: '16px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {DIAGRAM_TEMPLATES.filter(t => templateCategory === 'All' || t.category === templateCategory).map(template => (
                                        <div
                                            key={template.id}
                                            onClick={() => {
                                                setCode(template.code);
                                                setShowTemplateModal(false);
                                                setEditorMode('code'); // Switch to code to let it process
                                                setTimeout(() => setEditorMode('visual'), 100); // Optional auto-switch
                                            }}
                                            style={{
                                                border: '1px solid #30363d',
                                                borderRadius: '6px',
                                                padding: '12px',
                                                cursor: 'pointer',
                                                background: '#0d1117',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = '#00DC82'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = '#30363d'}
                                        >
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#c9d1d9', marginBottom: '4px' }}>{template.name}</div>
                                            <div style={{ fontSize: '12px', color: '#8b949e' }}>{template.description}</div>
                                            <div style={{ marginTop: '8px', fontSize: '10px', color: '#58a6ff', background: 'rgba(56, 139, 253, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                                                {template.type}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setShowTemplateModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Diagram AI Modal */}
            {
                showAIModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }} onClick={() => setShowAIModal(false)}>
                        <div style={{
                            background: '#1c2128',
                            borderRadius: '12px',
                            border: '1px solid #30363d',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            width: '100%',
                            maxWidth: '560px',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }} onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div style={{
                                padding: '24px 24px 20px',
                                borderBottom: '1px solid #30363d'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <Sparkles size={20} style={{ color: '#00DC82' }} />
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#c9d1d9' }}>
                                        {aiMode === 'code-import' ? 'Smart Code Import' : aiMode === 'tour' ? 'Start Code Tour' : 'Enhance Diagram'}
                                    </h3>
                                </div>

                                {/* Tab Buttons */}
                                <div style={{ display: 'flex', background: '#0d1117', borderRadius: '8px', padding: '4px', gap: '4px' }}>
                                    <button
                                        onClick={() => setAiMode('instruction')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: aiMode === 'instruction' ? '#00DC82' : 'transparent',
                                            color: aiMode === 'instruction' ? '#000' : '#8b949e',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Edit / Enhance
                                    </button>
                                    <button
                                        onClick={() => setAiMode('code-import')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: aiMode === 'code-import' ? '#00DC82' : 'transparent',
                                            color: aiMode === 'code-import' ? '#000' : '#8b949e',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Import Code
                                    </button>
                                    <button
                                        onClick={() => setAiMode('logic-flow')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: aiMode === 'logic-flow' ? '#00DC82' : 'transparent',
                                            color: aiMode === 'logic-flow' ? '#000' : '#8b949e',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Logic Flow
                                    </button>
                                    <button
                                        onClick={() => setAiMode('tour')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: aiMode === 'tour' ? '#00DC82' : 'transparent',
                                            color: aiMode === 'tour' ? '#000' : '#8b949e',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Eye size={14} /> Start Tour
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{
                                padding: '24px',
                                overflowY: 'auto',
                                flex: 1
                            }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '10px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#8b949e',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {aiMode === 'instruction' ? 'Your Instruction' :
                                        aiMode === 'code-import' ? 'Paste Code Snippet' :
                                            aiMode === 'tour' ? 'Tour Topic' :
                                                'Function Code'}
                                </label>
                                <textarea
                                    value={aiInstruction}
                                    onChange={(e) => setAiInstruction(e.target.value)}
                                    onDrop={handleDropOnAI}
                                    onDragOver={(e) => e.preventDefault()}
                                    placeholder={
                                        aiMode === 'instruction' ? "e.g. 'Add a database node connected to the API'" :
                                            aiMode === 'code-import' ? "Paste your JSON, SQL, or Class definitions here..." :
                                                aiMode === 'tour' ? "e.g. 'Authentication Flow' or 'Payment Processing'" :
                                                    "Paste the function code you want to visualize..."
                                    }
                                    style={{
                                        width: '100%',
                                        height: '140px',
                                        padding: '14px',
                                        borderRadius: '8px',
                                        border: '1px solid #30363d',
                                        background: '#0d1117',
                                        color: '#c9d1d9',
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#00DC82'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#30363d'}
                                />

                                {aiMode === 'instruction' && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '8px',
                                        marginTop: '16px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {[
                                            { label: 'Professional', value: 'Use a Professional Blue/Gray color theme with rounded nodes' },
                                            { label: 'Vibrant', value: 'Use Vibrant Colors and distinct shapes for different node types' },
                                            { label: 'Minimalist', value: 'Use a Minimalist Black & White theme' },
                                            { label: 'Rotate Layout', value: 'Make the layout Left-to-Right (LR) instead of Top-Down' }
                                        ].map(preset => (
                                            <button
                                                key={preset.label}
                                                onClick={() => setAiInstruction(preset.value)}
                                                style={{
                                                    padding: '8px 14px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #30363d',
                                                    background: '#21262d',
                                                    color: '#8b949e',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = '#00DC82';
                                                    e.currentTarget.style.color = '#c9d1d9';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = '#30363d';
                                                    e.currentTarget.style.color = '#8b949e';
                                                }}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid #30363d',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => setShowAIModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#c9d1d9',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#30363d';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#21262d';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeEnhancement}
                                    disabled={saving}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: saving ? '#484f58' : 'linear-gradient(135deg, #00DC82 0%, #0a3d2e 100%)',
                                        color: '#000',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        boxShadow: saving ? 'none' : '0 0 20px rgba(0, 220, 130, 0.4)',
                                        transition: 'all 0.2s',
                                        minWidth: '140px'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!saving) {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 220, 130, 0.5)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!saving) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 220, 130, 0.4)';
                                        }
                                    }}
                                >
                                    {saving ? 'Processing...' : (aiMode === 'instruction' ? 'Enhance' : aiMode === 'tour' ? 'Start Tour' : 'Generate Diagram')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            <div className={`editor-content ${showCode ? 'split' : 'full'}`}>
                <div className="preview-pane" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Render based on mode */}
                    {editorMode === 'code' || diagramLanguage === 'plantuml' ? (
                        <DiagramRenderer
                            code={code}
                            type={diagramLanguage}
                            onError={setError}
                            onNodeSelect={handleNodeSelect}
                        />
                    ) : (
                        <>
                            <ReactFlowEditor
                                initialNodes={flowNodes}
                                initialEdges={flowEdges}
                                onNodesChange={handleFlowNodesChange}
                                onEdgesChange={handleFlowEdgesChange}
                                onNodeClick={handleFlowNodeClick}
                                onEdgeClick={handleFlowEdgeClick}
                                onNodeDragStart={handleNodeDragStart}
                                onNodeDragStop={handleNodeDragStop}
                                backgroundColor={bgColor}
                                backgroundVariant={bgPattern}
                                activeNodeId={isTourActive ? tourSteps[currentTourStep]?.nodeId : null}
                            />

                            {/* Tour Overlay */}
                            {isTourActive && (
                                <TourOverlay
                                    currentStepIndex={currentTourStep}
                                    steps={tourSteps}
                                    onNext={() => {
                                        if (currentTourStep < tourSteps.length - 1) {
                                            setCurrentTourStep(prev => prev + 1);
                                        } else {
                                            // Finish - restore original mode if needed
                                            if (preTourSnapshot?.editorMode === 'code') {
                                                console.log('📐 Restoring Code mode after tour');
                                                setEditorMode('code');
                                            }
                                            setIsTourActive(false);
                                            setTourSteps([]);
                                            setPreTourSnapshot(null); // Clear snapshot
                                            setNotification({ message: 'Tour completed!', type: 'success' });
                                        }
                                    }}
                                    onPrev={() => {
                                        if (currentTourStep > 0) {
                                            setCurrentTourStep(prev => prev - 1);
                                        }
                                    }}
                                    onClose={() => {
                                        // Restore original mode if needed
                                        if (preTourSnapshot?.editorMode === 'code') {
                                            console.log('📐 Restoring Code mode after tour close');
                                            setEditorMode('code');
                                        }
                                        setIsTourActive(false);
                                        setTourSteps([]);
                                        setPreTourSnapshot(null); // Clear snapshot
                                    }}
                                />
                            )}
                        </>
                    )}
                    {error && <div className="error-message">{error}</div>}
                </div>
                {showCode && (
                    <div className="code-pane">
                        <div className="code-header">
                            <span>{diagramLanguage.toUpperCase()} CODE</span>
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Write your diagram code here..."
                            spellCheck={false}
                        />
                    </div>
                )}
            </div>

            {/* Sleek Notification Toast */}
            {
                notification && (
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: notification.type === 'error' ? '#1f2937' : '#1f2937', // Dark background
                        border: notification.type === 'error' ? '1px solid #ef4444' : '1px solid #10b981', // Colored border
                        backdropFilter: 'blur(8px)',
                        color: '#f9fafb', // White text
                        padding: '10px 20px',
                        borderRadius: '8px', // Professional radius
                        fontSize: '14px',
                        fontWeight: 500,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                        zIndex: 9999,
                        animation: 'slideUp 0.3s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        {notification.type === 'success' ? (
                            <div style={{ color: '#10b981', display: 'flex' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        ) : (
                            <div style={{ color: '#ef4444', display: 'flex' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </div>
                        )}
                        <span>{notification.message}</span>
                        <style>{`
                        @keyframes slideUp {
                            from { transform: translate(-50%, 20px); opacity: 0; }
                            to { transform: translate(-50%, 0); opacity: 1; }
                        }
                    `}</style>
                    </div>
                )
            }
        </div >
    );
};

export default DiagramEditor;

// Commit #6: refactor: simplify state management logic in diagram editor - 2026-02-12T04:15:36.584Z
