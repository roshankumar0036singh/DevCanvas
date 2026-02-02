import React, { useState, useEffect } from 'react';
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
                <div className="header-top">
                    <h1>DevCanvas</h1>
                </div>
                <nav className="nav">
                    <button
                        className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setCurrentView('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentView('settings')}
                    >
                        ⚙️ Settings
                    </button>
                </nav>
            </header>

            <main className="main">
                {currentView === 'dashboard' && <Dashboard settings={settings} />}
                {currentView === 'settings' && (
                    <Settings settings={settings} onUpdate={handleSettingsUpdate} />
                )}
            </main>

            <footer className="footer">
                <span className="version">v0.1.0</span>
                <a
                    href="https://github.com/devcanvas/devcanvas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="github-link"
                >
                    GitHub
                </a>
            </footer>
        </div>
    );
};

export default App;
