import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings as SettingsIcon, Github, Code } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import DiagramEditor from './components/DiagramEditor';
import DocumentEditor from './components/DocumentEditor';
import storage from '../utils/storage';
import type { Settings as SettingsType } from '../utils/storage';

type View = 'dashboard' | 'settings' | 'editor' | 'document';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [settings, setSettings] = useState<SettingsType | null>(null);
    const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);
    const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const loadedSettings = await storage.getSettings();
        setSettings(loadedSettings);
    };

    const handleSettingsUpdate = async (newSettings: Partial<SettingsType>) => {
        await storage.updateSettings(newSettings);
        await loadSettings();
    };

    const handleOpenDiagram = (id: string | null) => {
        setActiveDiagramId(id);
        setCurrentView('editor');
    };

    const handleOpenDocument = (id: string | null) => {
        setActiveDocumentId(id);
        setCurrentView('document');
    };

    const handleBackToDashboard = () => {
        setActiveDiagramId(null);
        setActiveDocumentId(null);
        setCurrentView('dashboard');
    };

    if (!settings) {
        return (
            <div className="app loading">
                <div className="spinner"></div>
            </div>
        );
    }

    // Render full screen editor if in editor mode, hiding nav/header
    if (currentView === 'editor') {
        return (
            <div className={`app theme-${settings.theme}`}>
                <DiagramEditor
                    diagramId={activeDiagramId}
                    onBack={handleBackToDashboard}
                    onOpenDocument={handleOpenDocument}
                />
            </div>
        );
    }

    // Render document editor
    if (currentView === 'document') {
        return (
            <div className={`app theme-${settings.theme}`}>
                <DocumentEditor
                    documentId={activeDocumentId}
                    onBack={handleBackToDashboard}
                />
            </div>
        );
    }

    return (
        <div className={`app theme-${settings.theme}`}>
            <header className="header">
                <div className="header-brand" onClick={handleBackToDashboard} style={{ cursor: 'pointer' }}>
                    <div className="cyber-hex-logo">
                        <div className="hex-outer">
                            <div className="hex-inner">
                                <Code size={12} className="hex-icon" />
                            </div>
                        </div>
                        <div className="hex-glow"></div>
                    </div>
                    <h1 className="brand-title">DevCanvas</h1>
                </div>
                <nav className="nav-tabs">
                    <button
                        className={`nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setCurrentView('dashboard')}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        className={`nav-tab ${currentView === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentView('settings')}
                        title="Settings"
                    >
                        <SettingsIcon size={18} />
                        <span>Settings</span>
                    </button>
                </nav>
            </header>

            <main className="main-content">
                {currentView === 'dashboard' && (
                    <Dashboard
                        settings={settings}
                        onOpenDiagram={handleOpenDiagram}
                        onOpenDocument={handleOpenDocument}
                    />
                )}
                {currentView === 'settings' && (
                    <Settings settings={settings} onUpdate={handleSettingsUpdate} />
                )}
            </main>

            <footer className="footer-bar">
                <span className="version">v0.1.0</span>
                <a
                    href="https://github.com/roshankumar0036singh/DevCanvas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="github-link"
                >
                    <Github size={14} />
                    <span>Source</span>
                </a>
            </footer>
        </div>
    );
};

export default App;
