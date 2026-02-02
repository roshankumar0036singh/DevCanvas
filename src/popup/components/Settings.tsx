import React from 'react';
import type { Settings as SettingsType } from '../../utils/storage';

interface SettingsProps {
    settings: SettingsType;
    onUpdate: (settings: Partial<SettingsType>) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
    return (
        <div className="settings">
            <h2>Settings</h2>

            <section className="settings-section">
                <h3>Appearance</h3>
                <div className="setting-item">
                    <label htmlFor="theme">Theme</label>
                    <select
                        id="theme"
                        value={settings.theme}
                        onChange={(e) => onUpdate({ theme: e.target.value as 'light' | 'dark' })}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
            </section>

            <section className="settings-section">
                <h3>Diagrams</h3>
                <div className="setting-item">
                    <label htmlFor="defaultDiagramType">Default Diagram Type</label>
                    <select
                        id="defaultDiagramType"
                        value={settings.defaultDiagramType}
                        onChange={(e) =>
                            onUpdate({ defaultDiagramType: e.target.value as 'mermaid' | 'plantuml' })
                        }
                    >
                        <option value="mermaid">Mermaid</option>
                        <option value="plantuml">PlantUML</option>
                    </select>
                </div>
            </section>

            <section className="settings-section">
                <h3>AI Provider</h3>
                <div className="setting-item">
                    <label htmlFor="aiProvider">Provider</label>
                    <select
                        id="aiProvider"
                        value={settings.aiProvider}
                        onChange={(e) =>
                            onUpdate({ aiProvider: e.target.value as 'openai' | 'anthropic' | 'custom' })
                        }
                    >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div className="setting-item">
                    <label htmlFor="apiKey">API Key</label>
                    <input
                        id="apiKey"
                        type="password"
                        value={settings.apiKey || ''}
                        onChange={(e) => onUpdate({ apiKey: e.target.value })}
                        placeholder="Enter your API key"
                    />
                    <small className="setting-hint">
                        Your API key is stored locally and never shared
                    </small>
                </div>
            </section>

            <section className="settings-section">
                <h3>Sync</h3>
                <div className="setting-item checkbox">
                    <input
                        id="autoSync"
                        type="checkbox"
                        checked={settings.autoSync}
                        onChange={(e) => onUpdate({ autoSync: e.target.checked })}
                    />
                    <label htmlFor="autoSync">Auto-sync across devices</label>
                </div>
            </section>

            <section className="settings-section danger-zone">
                <h3>Danger Zone</h3>
                <button
                    className="btn-danger"
                    onClick={() => {
                        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                            // TODO: Implement clear all data
                            console.log('Clear all data');
                        }
                    }}
                >
                    Clear All Data
                </button>
            </section>
        </div>
    );
};

export default Settings;
