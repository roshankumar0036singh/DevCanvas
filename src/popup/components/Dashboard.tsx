import React, { useState, useEffect } from 'react';
import {
    BarChart2,
    FileText,
    Code2,
    Plus,
    Clock,
    ChevronRight,
    X,
    GitBranch,
    BookOpen
} from 'lucide-react';
import AIProcessingOverlay from './AIProcessingOverlay';
import storage from '../../utils/storage';
import { MessageType, sendMessage } from '../../utils/messaging';
import type { Settings, Diagram, Document } from '../../utils/storage';

interface DashboardProps {
    settings: Settings;
    onOpenDiagram: (id: string | null) => void;
    onOpenDocument: (id: string | null) => void;
}

interface RepoStructureItem {
    name: string;
    type: 'file' | 'dir';
}

interface ContentScriptResponse {
    success: boolean;
    data?: string | {
        structure?: RepoStructureItem[];
        diagram?: string;
        extraContext?: string;
    };
    error?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ settings, onOpenDiagram, onOpenDocument }) => {
    const [diagrams, setDiagrams] = useState<Diagram[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [recentItems, setRecentItems] = useState<Array<{ type: 'diagram' | 'document'; id: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [showAnalysisMenu, setShowAnalysisMenu] = useState(false);

    // New state for Repo Analysis
    const [repoAnalysisMode, setRepoAnalysisMode] = useState(false);
    const [repoSettings, setRepoSettings] = useState({
        diagramType: 'graph TD',
        prompt: '',
        analysisType: 'flowchart' as 'flowchart' | 'issues' | 'health'
    });
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiMessage, setAiMessage] = useState('');

    const handleCreateDiagram = () => {
        onOpenDiagram(null);
    };

    const handleCreateDocument = () => {
        onOpenDocument(null); // Open editor with new document
    };

    const handleAnalyzeRepo = () => {
        setRepoAnalysisMode(false);
        setRepoSettings({ diagramType: 'graph TD', prompt: '', analysisType: 'flowchart' });
        setShowAnalysisMenu(true);
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [diagramsData, documentsData, recentData] = await Promise.all([
            storage.getDiagrams(),
            storage.getDocuments(),
            storage.getRecentItems(),
        ]);
        setDiagrams(diagramsData);
        setDocuments(documentsData);
        setRecentItems(recentData);
        setLoading(false);
    };

    // Handlers replaced by openFeatureModal
    // const handleCreateDiagram = ...
    // const handleCreateDocument = ...
    // const handleAnalyzeRepo = ...

    const handleAnalysisTypeSelect = async (type: 'flowchart' | 'readme' | 'issues' | 'health' | 'review') => {
        if (aiProcessing) {
            console.warn('Analysis already in progress');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return;

        if (!tab.url?.includes('github.com')) {
            alert('Please navigate to a GitHub repository first.');
            setShowAnalysisMenu(false);
            return;
        }

        try {
            if (type === 'flowchart' || type === 'health') {
                // Use ANALYZE_REPO to get structure, then AI to generate

                const response: any = await sendMessageToTab(tab.id, {
                    type: MessageType.ANALYZE_REPO,
                });

                if (response.success && response.data) {
                    setShowAnalysisMenu(false);
                    // If we have AI prompt, use AI service
                    // Handle legacy string return (old content script) vs new object return
                    let content = typeof response.data === 'string' ? response.data : response.data.diagram;

                    if (repoAnalysisMode && response.data.structure) {
                        try {
                            // Dynamic import to avoid circular dep or heavy load
                            const aiService = await import('../../utils/aiService');
                            const structureStr = response.data.structure.map((s: any) => `${s.type === 'dir' ? '/' : ''}${s.name}`).join('\n');

                            // Show premium loading state
                            setAiMessage(type === 'health' ? 'Generating Health Heatmap...' : 'Architecting Repository Map...');
                            setAiProcessing(true);

                            const aiContent = await aiService.visualizeRepository(
                                structureStr,
                                settings,
                                repoSettings.diagramType,
                                repoSettings.prompt,
                                response.data.extraContext,
                                type === 'health' // isHealthMap
                            );
                            setAiProcessing(false);

                            if (aiContent && aiContent.trim().length > 0) {
                                content = aiContent;
                            } else {
                                console.warn('AI returned empty diagram, falling back to default structure');
                                alert('AI could not generate a valid diagram. Showing default file structure.');
                            }
                        } catch (aiErr: any) {
                            console.error('AI Gen failed, using default', aiErr);
                            alert(`AI Analysis failed: ${aiErr.message || 'Unknown error'}`);
                            // Fallback to default
                        }
                    }


                    // Extract repo name securely from URL
                    const urlParts = tab.url?.split('github.com/')?.[1]?.split('/');
                    const repoName = urlParts && urlParts.length >= 2 ? `${urlParts[0]}/${urlParts[1]}` : 'Unknown Repo';

                    const newDiagram = await storage.addDiagram({
                        title: type === 'health' ? `Health Map: ${repoName}` : `Repo: ${repoName}`,
                        type: 'mermaid',
                        content: content,
                        tags: ['github', 'flowchart', 'auto-generated'],
                        metadata: {
                            repoStructure: response.data && typeof response.data !== 'string' && response.data.structure
                                ? response.data.structure.map((s: RepoStructureItem) => `${s.type === 'dir' ? '/' : ''}${s.name}`).join('\n')
                                : '',
                            extraContext: typeof response.data !== 'string' ? response.data?.extraContext : ''
                        }
                    });

                    await loadData();
                    onOpenDiagram(newDiagram.id);
                } else {
                    if (response.error && response.error.includes('Receiving end does not exist')) {
                        alert('Connection to page failed. Please REFRESH the GitHub page and try again.');
                    } else if (response.error) {
                        alert(`Analysis failed: ${response.error}`);
                    } else {
                        alert('No diagram structure found. Make sure you are viewing a file list.');
                    }
                }
            } else if (type === 'issues') {
                const response: ContentScriptResponse = await sendMessageToTab(tab.id, {
                    type: MessageType.ANALYZE_REPO,
                });

                if (response.success && typeof response.data !== 'string' && response.data?.structure) {
                    setShowAnalysisMenu(false);
                    try {
                        const aiService = await import('../../utils/aiService');
                        const structureStr = response.data.structure.map((s: RepoStructureItem) => `${s.type === 'dir' ? '/' : ''}${s.name}`).join('\n');

                        setAiMessage('Genie is auditing your code...');
                        setAiProcessing(true);

                        const aiContent = await aiService.analyzeRepoIssues(
                            structureStr,
                            settings,
                            repoSettings.prompt,
                            response.data.extraContext
                        );
                        setAiProcessing(false);

                        if (aiContent) {
                            // Extract repo name securely from URL
                            const urlParts = tab.url?.split('github.com/')?.[1]?.split('/');
                            const repoName = urlParts && urlParts.length >= 2 ? `${urlParts[0]}/${urlParts[1]}` : 'Unknown Repo';

                            const doc = await storage.addDocument({
                                title: `Issues: ${repoName}`,
                                content: aiContent,
                                tags: ['github', 'issues', 'analysis']
                            });

                            await loadData();
                            onOpenDocument(doc.id);
                        } else {
                            alert('AI could not identify any issues for this repository.');
                        }
                    } catch (aiErr: any) {
                        console.error('Issue analysis failed', aiErr);
                        alert(`Issue Analysis failed: ${aiErr.message || 'Unknown error'}`);
                    }
                } else {
                    alert('No repository structure found. Make sure you are viewing a GitHub file list.');
                }
            } else if (type === 'readme') {
                setShowAnalysisMenu(false);
                const response = await sendMessageToTab(tab.id, {
                    type: MessageType.ANALYZE_README,
                });

                if (response.success && response.data?.readme) {
                    const doc = await storage.addDocument({
                        title: `README: ${response.data.repoName || 'Unknown'}`,
                        content: response.data.readme,
                        tags: ['github', 'readme', 'original']
                    });

                    await loadData();
                    onOpenDocument(doc.id);
                } else {
                    // Better error handling with user guidance
                    if (response.error?.includes('Receiving end does not exist')) {
                        alert('⚠️ Connection Error\n\nPlease:\n1. Reload this extension (chrome://extensions)\n2. Refresh this GitHub page\n3. Try again');
                    } else if (response.error?.includes('Not a valid GitHub')) {
                        alert('Please navigate to a GitHub repository page first.');
                    } else {
                        alert(`Failed to fetch README: ${response.error || 'Unknown error'}`);
                    }
                }
            } else if (type === 'review') {
                setShowAnalysisMenu(false);
                setAiMessage('Genie is reviewing the PR...');
                setAiProcessing(true);

                const response = await sendMessage({
                    type: MessageType.FETCH_PR_DIFF,
                    data: { url: tab.url },
                    target: 'background',
                });

                if (response.success && response.data) {
                    try {
                        const aiService = await import('../../utils/aiService');
                        const reviewContent = await aiService.reviewPullRequest(
                            response.data,
                            settings
                        );
                        setAiProcessing(false);

                        if (reviewContent) {
                            const urlParts = tab.url?.split('github.com/')?.[1]?.split('/');
                            const repoName = urlParts && urlParts.length >= 2 ? `${urlParts[0]}/${urlParts[1]}` : 'Unknown Repo';
                            const prNumber = urlParts && urlParts.length >= 4 ? urlParts[3] : 'Unknown';

                            const doc = await storage.addDocument({
                                title: `PR Review: ${repoName} #${prNumber}`,
                                content: reviewContent,
                                tags: ['github', 'pr-review', 'analysis']
                            });

                            await loadData();
                            onOpenDocument(doc.id);
                        }
                    } catch (aiErr: any) {
                        console.error('PR Review failed', aiErr);
                        alert(`PR Review failed: ${aiErr.message || 'Unknown error'}`);
                        setAiProcessing(false);
                    }
                } else {
                    setAiProcessing(false);
                    alert(response.error || 'Could not fetch PR diff. Make sure you are on a GitHub PR page.');
                }
            }
        } catch (err: any) {
            console.error('Analysis failed', err);
            setAiProcessing(false);
            alert(`Analysis error: ${err.message}`);
        }
    };

    const sendMessageToTab = async (tabId: number, msg: any) => {
        return new Promise<any>((resolve) => {
            const messageWithTarget = { ...msg, target: 'content-script' };
            console.log('DevCanvas: Sending message to tab:', tabId, msg.type);

            try {
                chrome.tabs.sendMessage(tabId, messageWithTarget, (response) => {
                    if (chrome.runtime.lastError) {
                        const errMsg = chrome.runtime.lastError.message || 'Unknown message error';
                        console.error('DevCanvas: Messaging error:', errMsg);
                        resolve({ success: false, error: errMsg });
                    } else {
                        resolve(response || { success: false, error: 'No response from content script' });
                    }
                });
            } catch (err: any) {
                console.error('DevCanvas: Critical messaging error:', err);
                resolve({ success: false, error: err.message });
            }
        });
    };

    const getRecentItemDetails = (item: { type: 'diagram' | 'document'; id: string }) => {
        if (item.type === 'diagram') {
            return diagrams.find(d => d.id === item.id);
        } else {
            return documents.find(d => d.id === item.id);
        }
    };

    const handleItemClick = (item: { type: 'diagram' | 'document'; id: string }) => {
        if (item.type === 'diagram') {
            onOpenDiagram(item.id);
        } else {
            onOpenDocument(item.id);
        }
    };

    // Check window width for "Expand Pane" notification
    const [showExpandHint, setShowExpandHint] = useState(false);

    useEffect(() => {
        const checkWidth = () => {
            // If width is less than 500px, suggest expanding
            if (window.innerWidth < 500) {
                setShowExpandHint(true);
            } else {
                setShowExpandHint(false);
            }
        };

        checkWidth();
        window.addEventListener('resize', checkWidth);
        return () => window.removeEventListener('resize', checkWidth);
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {aiProcessing && <AIProcessingOverlay message={aiMessage} />}
            {/* Expand Pane Notification */}
            {showExpandHint && (
                <div className="expand-hint-toast">
                    <div className="hint-content">
                        <ChevronRight size={16} className="hint-icon" />
                        <span>Expand panel for better view</span>
                    </div>
                    <button onClick={() => setShowExpandHint(false)} className="hint-close">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Analysis Options Modal */}
            {showAnalysisMenu && (
                <div className="modal-overlay" onClick={() => setShowAnalysisMenu(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Choose Analysis Type</h2>
                            <button className="modal-close" onClick={() => setShowAnalysisMenu(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {!repoAnalysisMode ? (
                            <div className="analysis-options">
                                <button
                                    className="analysis-option"
                                    onClick={() => {
                                        setRepoSettings(prev => ({ ...prev, analysisType: 'flowchart' }));
                                        setRepoAnalysisMode(true);
                                    }}
                                >
                                    <div className="option-icon">
                                        <GitBranch size={24} />
                                    </div>
                                    <div className="option-details">
                                        <h3>Repository Diagram</h3>
                                        <p>Generate flowchart, user flow, or architecture diagram</p>
                                    </div>
                                </button>
                                <button
                                    className="analysis-option"
                                    onClick={() => handleAnalysisTypeSelect('readme')}
                                >
                                    <div className="option-icon">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="option-details">
                                        <h3>README Analysis</h3>
                                        <p>Fetch and edit README in markdown editor</p>
                                    </div>
                                </button>
                                <button
                                    className="analysis-option"
                                    onClick={() => {
                                        setRepoSettings(prev => ({ ...prev, analysisType: 'issues' }));
                                        setRepoAnalysisMode(true);
                                    }}
                                >
                                    <div className="option-icon" style={{ color: 'var(--brand-solid)' }}>
                                        <FileText size={24} />
                                    </div>
                                    <div className="option-details">
                                        <h3>Genie Audit</h3>
                                        <p>Scan for bugs, features, and security improvements</p>
                                    </div>
                                </button>
                                <button
                                    className="analysis-option"
                                    onClick={() => {
                                        setRepoSettings(prev => ({ ...prev, analysisType: 'health' }));
                                        setRepoAnalysisMode(true);
                                    }}
                                >
                                    <div className="option-icon" style={{ color: 'var(--health-healthy)' }}>
                                        <BarChart2 size={24} />
                                    </div>
                                    <div className="option-details">
                                        <h3>Health Map</h3>
                                        <p>Visualize security & performance health of the codebase</p>
                                    </div>
                                </button>
                                <button
                                    className="analysis-option"
                                    onClick={() => handleAnalysisTypeSelect('review')}
                                >
                                    <div className="option-icon" style={{ color: 'var(--brand-solid)' }}>
                                        <Code2 size={24} />
                                    </div>
                                    <div className="option-details">
                                        <h3>Review PR</h3>
                                        <p>Comprehensive AI review of logic, security, and quality</p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="repo-analysis-form" style={{ padding: '16px' }}>
                                {repoSettings.analysisType === 'flowchart' && (
                                    <div className="form-group" style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Diagram Type</label>
                                        <div className="chip-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {[
                                                { id: 'graph TD', label: 'Architecture (Top-Down)' },
                                                { id: 'graph LR', label: 'Architecture (Left-Right)' },
                                                { id: 'sequenceDiagram', label: 'User Flow / Sequence' },
                                                { id: 'classDiagram', label: 'Class Diagram' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    className={`btn-chip ${repoSettings.diagramType === type.id ? 'active' : ''}`}
                                                    onClick={() => setRepoSettings(prev => ({ ...prev, diagramType: type.id }))}
                                                    style={{
                                                        background: repoSettings.diagramType === type.id ? 'rgba(0, 220, 130, 0.1)' : 'var(--bg-element)',
                                                        borderColor: repoSettings.diagramType === type.id ? 'var(--brand-solid)' : 'var(--border)',
                                                        color: repoSettings.diagramType === type.id ? 'var(--brand-solid)' : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Genie Instruction (Optional)</label>
                                    <textarea
                                        className="ai-input-area"
                                        value={repoSettings.prompt}
                                        onChange={(e) => setRepoSettings(prev => ({ ...prev, prompt: e.target.value }))}
                                        placeholder="e.g. 'Focus on security', 'Find technical debt'..."
                                        rows={3}
                                    />
                                </div>
                                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button className="btn-secondary" onClick={() => setRepoAnalysisMode(false)}>Back</button>
                                    <button className="btn-primary" onClick={() => handleAnalysisTypeSelect(repoSettings.analysisType)}>
                                        {repoSettings.analysisType === 'flowchart' ? 'Generate Diagram' :
                                            repoSettings.analysisType === 'health' ? 'Generate Health Map' : 'Run Genie Audit'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <section className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon diagram">
                        <BarChart2 size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{diagrams.length}</span>
                        <span className="stat-label">Diagrams</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon document">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{documents.length}</span>
                        <span className="stat-label">Docs</span>
                    </div>
                </div>
            </section>

            <section className="quick-actions">
                <h2 className="section-title">Quick Actions</h2>
                <div className="actions-grid">
                    <button className="action-card primary" onClick={handleCreateDiagram}>
                        <div className="action-icon-wrapper">
                            <Plus size={20} />
                        </div>
                        <div className="action-details">
                            <span className="action-name">New Diagram</span>
                            <span className="action-hint">Flowcharts, Sequence...</span>
                        </div>
                    </button>
                    <button className="action-card" onClick={handleCreateDocument}>
                        <div className="action-icon-wrapper">
                            <FileText size={20} />
                        </div>
                        <div className="action-details">
                            <span className="action-name">New Document</span>
                            <span className="action-hint">Markdown editor</span>
                        </div>
                    </button>
                    <button className="action-card" onClick={handleAnalyzeRepo}>
                        <div className="action-icon-wrapper">
                            <Code2 size={20} />
                        </div>
                        <div className="action-details">
                            <span className="action-name">Analyze Repo</span>
                            <span className="action-hint">Multiple analysis options</span>
                        </div>
                    </button>
                </div>
            </section>

            <section className="recent-section">
                <h2 className="section-title">Recent Activity</h2>
                {recentItems.length === 0 ? (
                    <div className="empty-state">
                        <Clock size={24} />
                        <p>No recent activity</p>
                    </div>
                ) : (
                    <div className="recent-list">
                        {recentItems.slice(0, 5).map((item) => {
                            const details = getRecentItemDetails(item);
                            if (!details) return null;

                            return (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    className="recent-row"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <div className={`row-icon ${item.type}`}>
                                        {item.type === 'diagram' ? <BarChart2 size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="row-content">
                                        <span className="row-title">{details.title}</span>
                                        <span className="row-date">
                                            {new Date(details.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <ChevronRight size={14} className="row-arrow" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Dashboard;
