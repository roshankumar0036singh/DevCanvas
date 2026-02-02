import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings as SettingsIcon, Github } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import storage from '../utils/storage';
import type { Settings as SettingsType } from '../utils/storage';

type View = 'dashboard' | 'settings';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [settings, setSettings] = useState<SettingsType | null>(null);

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

    if (!settings) {
        return (
            <div className="app loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className={`app theme-${settings.theme}`}>
            <header className="header">
                <div className="header-brand">
                    <div className="brand-logo">DC</div>
                    <h1>DevCanvas</h1>
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
                {currentView === 'dashboard' && <Dashboard settings={settings} />}
                {currentView === 'settings' && (
                    <Settings settings={settings} onUpdate={handleSettingsUpdate} />
                )}
            </main>

            <footer className="footer-bar">
                <span className="version">v0.1.0</span>
                <a
                    href="https://github.com/devcanvas/devcanvas"
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
