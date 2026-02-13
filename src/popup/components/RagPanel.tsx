import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Play, AlertCircle, Github, CheckCircle2, X, Terminal, Bot, User } from 'lucide-react';
import { ingestGitHubRepo } from '../../utils/rag/browserIngestion';
import { queryCodebase } from '../../utils/rag/retrieval';
import storage from '../../utils/storage';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const RagPanel: React.FC = () => {
    const [repoUrl, setRepoUrl] = useState('');
    const [isIngesting, setIsIngesting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ingestedRepo, setIngestedRepo] = useState<string | null>(null);
    const [showRepoInput, setShowRepoInput] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load initial state and detect current tab URL
    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].url) {
                const url = tabs[0].url;
                const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
                if (match) {
                    setRepoUrl(`${match[1]}/${match[2]}`);
                }
            }
        });

        // Check for pending input from context menu
        chrome.storage.local.get(['pendingDiagramInput', 'pendingDiagramTimestamp'], (result) => {
            if (result.pendingDiagramInput) {
                // optional: check timestamp to ensure freshness (e.g. within 1 min)
                const isRecent = Date.now() - (result.pendingDiagramTimestamp || 0) < 60000;
                if (isRecent) {
                    setInputValue(result.pendingDiagramInput);
                    // Clear it so it doesn't reappear
                    chrome.storage.local.remove(['pendingDiagramInput', 'pendingDiagramTimestamp']);
                }
            }
        });
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (ingestedRepo) {
            setShowRepoInput(false);
        }
    }, [ingestedRepo]);

    const handleIngest = async () => {
        if (!repoUrl) return;
        setError(null);
        setIsIngesting(true);
        setProgress(0);

        try {
            const settings = await storage.getSettings();
            if (!settings) throw new Error('Could not load settings');

            const aiProvider = settings.aiProvider || 'openai';
            const aiKey = settings.apiKeys?.[aiProvider];

            if (!settings.apiKeys?.['pinecone']) {
                throw new Error('Pinecone API Key is missing. Please add it in Settings.');
            }

            await ingestGitHubRepo(repoUrl, {
                pineconeApiKey: settings.apiKeys['pinecone'],
                aiProvider: aiProvider as any,
                aiApiKey: aiKey,
                githubToken: settings.githubToken,
                onProgress: (p) => {
                    setProgress(p);
                },
            });

            setIngestedRepo(repoUrl);
            setMessages(prev => [...prev, {
                id: 'sys-welcome',
                role: 'system',
                content: `Successfully ingested **${repoUrl}**. I'm ready to answer questions about the codebase.`
            }]);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Ingestion failed');
        } finally {
            setIsIngesting(false);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsChatting(true);

        try {
            const settings = await storage.getSettings();
            if (!settings?.apiKeys?.['pinecone']) {
                throw new Error('Pinecone API Key missing.');
            }

            const answer = await queryCodebase(userMsg.content, {
                pineconeApiKey: settings.apiKeys['pinecone'],
                openaiApiKey: settings.apiKeys?.[settings.aiProvider || 'openai'],
                aiProvider: settings.aiProvider as any,
            });

            const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: answer };
            setMessages(prev => [...prev, botMsg]);

        } catch (err: any) {
            const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'system', content: `Error: ${err.message}` };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsChatting(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    const formatMessage = (content: string) => {
        const parts = content.split(/(\[.*?\]\([^)]+\)|https?:\/\/[^\s<>]+|\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.match(/^\[.*?\]\([^)]+\)$/)) {
                const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
                const label = match ? match[1].replace(/\*\*/g, '') : '';
                let href = match ? match[2] : '';

                if (href && !href.startsWith('http') && !href.startsWith('mailto:') && (ingestedRepo || repoUrl)) {
                    const cleanRepo = (ingestedRepo || repoUrl).replace(/\/$/, '');
                    const cleanPath = href.replace(/^(\.\/|\/)/, '');
                    href = `https://github.com/${cleanRepo}/blob/main/${cleanPath}`;
                }

                if (match) return <a key={index} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{label}</a>;
            }
            if (part.match(/^https?:\/\/[^\s<>]+$/)) {
                return <a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
            }
            if (part.match(/^\*\*.*?\*\*$/)) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-main)',
            fontFamily: 'var(--font-main)',
            overflow: 'hidden',
            position: 'relative', // Fix: Establish positioning context for floating status bar
        }}>
            {/* Ambient Background Gradient */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '200px',
                background: 'radial-gradient(ellipse at top, rgba(0, 220, 130, 0.15), transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* Glassmorphic Header */}

            {/* Minimal Status Bar - Floating */}
            <div style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                borderRadius: '24px',
                padding: '6px 12px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                maxWidth: '90%'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {ingestedRepo ? (
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--brand-solid)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '180px'
                        }}>
                            <CheckCircle2 size={12} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ingestedRepo}</span>
                        </div>
                    ) : (
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap'
                        }}>
                            <Github size={12} /> No active repository
                        </div>
                    )}
                </div>

                {messages.length > 0 && (
                    <>
                        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', margin: '0 8px', flexShrink: 0 }} />
                        <button
                            onClick={clearChat}
                            title="Clear Conversation"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            <X size={14} />
                            <span style={{ fontSize: '11px', marginLeft: '4px' }}>Clear</span>
                        </button>
                    </>
                )}
            </div>

            {/* Scrollable Content Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '80px 20px 100px 20px', // Increased bottom padding for floating input
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                zIndex: 1,
                scrollBehavior: 'smooth'
            }}>
                {/* Repository Setup (Collapsible) */}
                {(!ingestedRepo || showRepoInput) && (
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '6px',
                        marginBottom: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'var(--bg-element)',
                            borderRadius: '12px',
                            padding: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <div style={{
                                padding: '0 12px',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-secondary)'
                            }}>
                                <Github size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="owner/repo"
                                value={repoUrl}
                                onChange={e => setRepoUrl(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '12px 0',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: 'monospace'
                                }}
                                disabled={isIngesting}
                            />
                            <button
                                onClick={handleIngest}
                                disabled={isIngesting || !repoUrl}
                                style={{
                                    background: isIngesting ? 'var(--bg-hover)' : 'var(--brand-solid)',
                                    color: isIngesting ? 'var(--text-muted)' : '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: isIngesting ? '0' : '8px 16px',
                                    width: isIngesting ? '32px' : 'auto',
                                    minWidth: isIngesting ? '32px' : 'auto',
                                    height: isIngesting ? '32px' : 'auto',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: isIngesting || !repoUrl ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    boxShadow: isIngesting ? 'none' : '0 0 12px rgba(0, 220, 130, 0.2)'
                                }}
                            >
                                {isIngesting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} fill="currentColor" />}
                                {!isIngesting && 'Connect'}
                            </button>
                        </div>

                        {/* Progress Indicator */}
                        {(isIngesting || progress > 0) && (
                            <div style={{ padding: '0 12px 12px 12px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    margin: '12px 0 6px 0',
                                    fontWeight: '500'
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isIngesting && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                        {isIngesting ? 'Ingesting repository...' : 'Processing complete'}
                                    </span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div style={{
                                    height: '6px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, var(--brand-solid), #36E4DA)',
                                        transition: 'width 0.3s ease',
                                        boxShadow: '0 0 10px rgba(0, 220, 130, 0.4)',
                                        borderRadius: '3px'
                                    }}>
                                        {isIngesting && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                background: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                                                backgroundSize: '20px 20px',
                                                animation: 'progress-bar-stripes 1s linear infinite',
                                                zIndex: 2
                                            }} />
                                        )}
                                    </div>
                                    <style>{`
                                        @keyframes spin {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes progress-bar-stripes {
                                            from { background-position: 40px 0; }
                                            to { background-position: 0 0; }
                                        }
                                    `}</style>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '12px',
                                margin: '0 4px 4px 4px',
                                borderRadius: '8px',
                                background: 'rgba(255, 82, 82, 0.1)',
                                border: '1px solid rgba(255, 82, 82, 0.2)',
                                fontSize: '11px',
                                color: 'var(--danger)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '6px'
                            }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        gap: '4px',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            marginBottom: '4px'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: msg.role === 'user' ? 'var(--bg-hover)' : 'rgba(0, 220, 130, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: msg.role === 'user' ? 'var(--text-secondary)' : 'var(--brand-solid)',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                                {msg.role === 'user' ? <User size={12} /> : msg.role === 'system' ? <Terminal size={12} /> : <Bot size={12} />}
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                {msg.role === 'user' ? 'You' : 'DevCanvas'}
                            </span>
                        </div>

                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '16px',
                            borderTopRightRadius: msg.role === 'user' ? '2px' : '16px',
                            borderTopLeftRadius: msg.role === 'assistant' || msg.role === 'system' ? '2px' : '16px',
                            background: msg.role === 'user'
                                ? 'linear-gradient(135deg, #00DC82 0%, #36E4DA 100%)'
                                : msg.role === 'system'
                                    ? 'var(--bg-element)'
                                    : 'var(--bg-card)',
                            color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            maxWidth: '90%',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                            fontWeight: msg.role === 'user' ? '500' : '400',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere'
                        }}>
                            {formatMessage(msg.content)}
                        </div>
                    </div>
                ))}

                {isChatting && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(0, 220, 130, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--brand-solid)',
                        }}>
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} style={{ height: '0px' }} />
            </div>

            {/* Input Area - Floating */}
            <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 32px)',
                maxWidth: '500px',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{
                    background: 'rgba(21, 26, 35, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    padding: '8px 8px 8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s',
                    position: 'relative'
                }}>
                    {!ingestedRepo && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: '24px',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'not-allowed'
                        }}>
                            <span style={{ fontSize: '11px', color: '#fff', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={12} /> Please connect a repository first
                            </span>
                        </div>
                    )}
                    <textarea
                        placeholder="Ask anything about the codebase..."
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            padding: '4px 0',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            outline: 'none',
                            fontFamily: 'var(--font-main)',
                            resize: 'none',
                            minHeight: '20px',
                            maxHeight: '100px',
                            height: 'auto'
                        }}
                        rows={1}
                        disabled={!ingestedRepo || isChatting}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!ingestedRepo || !inputValue.trim() || isChatting}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: (!ingestedRepo || !inputValue.trim()) ? 'rgba(255,255,255,0.05)' : 'var(--brand-solid)',
                            color: (!ingestedRepo || !inputValue.trim()) ? 'var(--text-muted)' : '#000',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: (!ingestedRepo || !inputValue.trim()) ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            boxShadow: (!ingestedRepo || !inputValue.trim()) ? 'none' : '0 0 10px rgba(0, 220, 130, 0.3)'
                        }}
                    >
                        <Send size={16} style={{ marginLeft: (!ingestedRepo || !inputValue.trim()) ? 0 : '-2px' }} />
                    </button>
                </div>
                {!ingestedRepo && (
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={() => setShowRepoInput(!showRepoInput)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '4px 12px',
                                fontSize: '10px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: '500'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                        >
                            {showRepoInput ? 'Hide Settings' : 'Repository Settings'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RagPanel;

// Commit #1: fix(ui): adjust padding in RAG panel container - 2026-02-12T04:15:35.444Z
