import React, { useState, useEffect } from 'react';
import storage from '../../utils/storage';
import { sendMessage, MessageType } from '../../utils/messaging';
import type { Settings, Diagram, Document } from '../../utils/storage';

interface DashboardProps {
    settings: Settings;
}

const Dashboard: React.FC<DashboardProps> = ({ settings }) => {
    const [diagrams, setDiagrams] = useState<Diagram[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [recentItems, setRecentItems] = useState<Array<{ type: 'diagram' | 'document'; id: string }>>([]);
    const [loading, setLoading] = useState(true);

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

    const handleCreateDiagram = async () => {
        const diagram = await storage.addDiagram({
            title: 'Untitled Diagram',
            type: settings.defaultDiagramType,
            content: '',
            tags: [],
        });
        await loadData();
        console.log('Created diagram:', diagram);
    };

    const handleCreateDocument = async () => {
        const doc = await storage.addDocument({
            title: 'Untitled Document',
            content: '',
            tags: [],
        });
        await loadData();
        console.log('Created document:', doc);
    };

    const handleAnalyzeRepo = async () => {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
            const response = await sendMessage({
                type: MessageType.ANALYZE_PAGE,
            });
            console.log('Page analysis:', response);
        }
    };

    const getRecentItemDetails = (item: { type: 'diagram' | 'document'; id: string }) => {
        if (item.type === 'diagram') {
            return diagrams.find(d => d.id === item.id);
        } else {
            return documents.find(d => d.id === item.id);
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="dashboard">
            <section className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <button className="action-btn primary" onClick={handleCreateDiagram}>
                        <span className="icon">📊</span>
                        <div className="action-content">
                            <span className="action-title">New Diagram</span>
                            <span className="action-desc">Create a diagram</span>
                        </div>
                    </button>
                    <button className="action-btn" onClick={handleCreateDocument}>
                        <span className="icon">📝</span>
                        <div className="action-content">
                            <span className="action-title">New Document</span>
                            <span className="action-desc">Write documentation</span>
                        </div>
                    </button>
                    <button className="action-btn" onClick={handleAnalyzeRepo}>
                        <span className="icon">🔗</span>
                        <div className="action-content">
                            <span className="action-title">Analyze Repo</span>
                            <span className="action-desc">Visualize code</span>
                        </div>
                    </button>
                </div>
            </section>

            <section className="stats">
                <div className="stat-card">
                    <span className="stat-value">{diagrams.length}</span>
                    <span className="stat-label">Diagrams</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{documents.length}</span>
                    <span className="stat-label">Documents</span>
                </div>
            </section>

            <section className="recent">
                <h2>Recent</h2>
                {recentItems.length === 0 ? (
                    <p className="empty-state">No recent items yet. Create your first diagram or document!</p>
                ) : (
                    <div className="recent-list">
                        {recentItems.slice(0, 5).map((item) => {
                            const details = getRecentItemDetails(item);
                            if (!details) return null;

                            return (
                                <div key={`${item.type}-${item.id}`} className="recent-item">
                                    <span className="recent-icon">
                                        {item.type === 'diagram' ? '📊' : '📝'}
                                    </span>
                                    <div className="recent-info">
                                        <span className="recent-title">{details.title}</span>
                                        <span className="recent-time">
                                            {new Date(details.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
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
