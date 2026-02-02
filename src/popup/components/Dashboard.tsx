import React, { useState, useEffect } from 'react';
import {
    BarChart2,
    FileText,
    Code2,
    Plus,
    Clock,
    ChevronRight
} from 'lucide-react';
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
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <section className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon diagram">
                        <BarChart2 size={18} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{diagrams.length}</span>
                        <span className="stat-label">Diagrams</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon document">
                        <FileText size={18} />
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
                            <span className="action-hint">Visualize codebase</span>
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
                                <div key={`${item.type}-${item.id}`} className="recent-row">
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
