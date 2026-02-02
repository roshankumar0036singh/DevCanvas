import React from 'react';
import {
    Palette,
    Layout,
    Cpu,
    Key,
    RefreshCw,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import type { Settings as SettingsType } from '../../utils/storage';

interface SettingsProps {
    settings: SettingsType;
    onUpdate: (settings: Partial<SettingsType>) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
    return (
        <div className="settings">
            <h2 className="section-title">Settings</h2>

            <div className="settings-group">
                <div className="group-header">
                    <Palette size={16} />
                    <h3>Appearance</h3>
                </div>
                <div className="setting-row">
                    <label htmlFor="theme">Theme</label>
                    <select
                        id="theme"
                        value={settings.theme}
                        onChange={(e) => onUpdate({ theme: e.target.value as 'light' | 'dark' })}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark (OSConnect)</option>
                    </select>
                </div>
            </div>

            <div className="settings-group">
                <div className="group-header">
                    <Layout size={16} />
                    <h3>Diagrams</h3>
                </div>
                <div className="setting-row">
                    <label htmlFor="defaultDiagramType">Default Type</label>
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
            </div>

            <div className="settings-group">
                <div className="group-header">
                    <Cpu size={16} />
                    <h3>AI Provider</h3>
                </div>
                <div className="setting-column">
                    <div className="input-group">
                        <label htmlFor="aiProvider">Provider</label>
                        <select
                            id="aiProvider"
                            value={settings.aiProvider}
                            onChange={(e) =>
                                onUpdate({ aiProvider: e.target.value as 'openai' | 'anthropic' | 'custom' })
                            }
                        >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label htmlFor="apiKey">API Key <Key size={12} /></label>
                        <input
                            id="apiKey"
                            type="password"
                            value={settings.apiKey || ''}
                            onChange={(e) => onUpdate({ apiKey: e.target.value })}
                            placeholder="sk-..."
                        />
                    </div>
                </div>
            </div>

            <div className="settings-group">
                <div className="group-header">
                    <RefreshCw size={16} />
                    <h3>Sync</h3>
                </div>
                <div className="setting-row checkbox">
                    <label htmlFor="autoSync">Auto-sync devices</label>
                    <input
                        id="autoSync"
                        type="checkbox"
                        checked={settings.autoSync}
                        onChange={(e) => onUpdate({ autoSync: e.target.checked })}
                    />
                </div>
            </div>

            <div className="settings-group danger">
                <div className="group-header">
                    <AlertTriangle size={16} />
                    <h3>Danger Zone</h3>
                </div>
                <button
                    className="btn-danger-outline"
                    onClick={() => {
                        if (confirm('Clear all data?')) {
                            console.log('Clear all data');
                        }
                    }}
                >
                    <Trash2 size={14} />
                    Clear All Data
                </button>
            </div>
        </div>
    );
};

export default Settings;
