import React, { useState } from 'react';
import {
    Palette,
    Layout,
    Cpu,
    Key,
    RefreshCw,
    Trash2,
    AlertTriangle,
    Check,
    Zap,
    Box,
    Wind,
    Sparkles,
    Globe,
    Eye,
    EyeOff,
    ExternalLink
} from 'lucide-react';
import type { Settings as SettingsType } from '../../utils/storage';

interface SettingsProps {
    settings: SettingsType;
    onUpdate: (settings: Partial<SettingsType>) => void;
}

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', icon: <Sparkles size={18} className="provider-icon openai" /> },
    { id: 'anthropic', name: 'Anthropic', icon: <Box size={18} className="provider-icon anthropic" /> },
    { id: 'gemini', name: 'Google Gemini', icon: <Globe size={18} className="provider-icon gemini" /> },
    { id: 'groq', name: 'Groq', icon: <Zap size={18} className="provider-icon groq" /> },
    { id: 'mistral', name: 'Mistral AI', icon: <Wind size={18} className="provider-icon mistral" /> },
] as const;

type Tab = 'general' | 'ai' | 'danger';

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    const [showToken, setShowToken] = useState(false);

    const handleApiKeyChange = (provider: keyof SettingsType['apiKeys'], key: string) => {
        const newApiKeys = { ...settings.apiKeys, [provider]: key };
        onUpdate({ apiKeys: newApiKeys });
    };

    return (
        <div className="settings">
            <h2 className="section-title">Settings</h2>

            {/* Custom Settings Tabs */}
            <div className="nav-tabs mb-4">
                <button
                    className={`nav-tab flex-1 justify-center ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    <Palette size={14} /> General
                </button>
                <button
                    className={`nav-tab flex-1 justify-center ${activeTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                >
                    <Cpu size={14} /> AI Models
                </button>

                <button
                    className={`nav-tab flex-1 justify-center ${activeTab === 'danger' ? 'active' : ''}`}
                    onClick={() => setActiveTab('danger')}
                >
                    <AlertTriangle size={14} /> Danger
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="animate-fade-in">
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
                                <option value="dark">Dark</option>
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

                    <div className="github-integration-card">
                        <div className="github-header-row">
                            <div className="github-title-block">
                                <div className="github-title">
                                    <Globe size={16} />
                                    GitHub API
                                </div>
                                <div className="github-desc">
                                    Access private repos & increase limits (5k/hr)
                                </div>
                            </div>
                            {settings.githubToken && (
                                <div className="github-status-badge" title="Token Saved">
                                    <Check size={14} />
                                </div>
                            )}
                        </div>

                        <div className="input-with-icon-wrapper">
                            <div className="input-with-icon">
                                <Key size={14} className="input-icon" />
                                <input
                                    id="githubToken"
                                    type={showToken ? "text" : "password"}
                                    value={settings.githubToken || ''}
                                    onChange={(e) => onUpdate({ githubToken: e.target.value })}
                                    placeholder="ghp_..."
                                    spellCheck={false}
                                />
                                <button
                                    className="toggle-visibility-btn"
                                    onClick={() => setShowToken(!showToken)}
                                    title={showToken ? "Hide Token" : "Show Token"}
                                    type="button"
                                >
                                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <div className="github-actions-row">
                            <a
                                href="https://github.com/settings/tokens/new?scopes=repo"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link-generate-token"
                            >
                                Generate Token <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="tab-content animate-fade-in">
                    <div className="tab-description">
                        Select an active provider to power AI features. Configure API keys for each provider below.
                    </div>

                    <div className="providers-list">
                        {PROVIDERS.map((provider) => {
                            const isActive = settings.aiProvider === provider.id;
                            const hasKey = !!settings.apiKeys?.[provider.id as keyof SettingsType['apiKeys']];
                            const isExpanded = expandedProvider === provider.id || isActive;

                            return (
                                <div
                                    key={provider.id}
                                    className={`provider-card ${isActive ? 'active' : ''}`}
                                >
                                    <div
                                        className="provider-header"
                                        onClick={() => {
                                            if (!isActive) onUpdate({ aiProvider: provider.id as SettingsType['aiProvider'] });
                                            setExpandedProvider(isExpanded ? null : provider.id);
                                        }}
                                    >
                                        <div className="provider-info">
                                            <div className="provider-icon-wrapper">
                                                {provider.icon}
                                            </div>
                                            <div className="provider-details">
                                                <div className="provider-name">
                                                    {provider.name}
                                                    {isActive && <span className="badge-active">ACTIVE</span>}
                                                </div>
                                                <div className="provider-status">
                                                    {hasKey ? '• Key Configured' : '• No Key Set'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="provider-check">
                                            {isActive && <Check size={18} />}
                                        </div>
                                    </div>

                                    {/* API Key Input Area */}
                                    {(isExpanded || isActive) && (
                                        <div className="provider-config">
                                            <div className="input-group">
                                                <label>
                                                    <Key size={10} /> {provider.name} API Key
                                                </label>
                                                <input
                                                    type="password"
                                                    value={settings.apiKeys?.[provider.id as keyof SettingsType['apiKeys']] || ''}
                                                    onChange={(e) => handleApiKeyChange(provider.id as keyof SettingsType['apiKeys'], e.target.value)}
                                                    placeholder={`sk-...`}
                                                    className="api-key-input"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}



            {activeTab === 'danger' && (
                <div className="settings-group danger animate-fade-in">
                    <div className="group-header">
                        <AlertTriangle size={16} />
                        <h3>Danger Zone</h3>
                    </div>
                    <p className="text-xs text-danger mb-4 opacity-80">
                        This action cannot be undone. This will permanently delete all your local diagrams and settings.
                    </p>
                    <button
                        className="btn-danger-outline"
                        onClick={() => {
                            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                                chrome.storage.local.clear(() => {
                                    window.location.reload();
                                });
                            }
                        }}
                    >
                        <Trash2 size={14} />
                        Clear All Data
                    </button>
                </div>
            )}
        </div>
    );
};

export default Settings;
