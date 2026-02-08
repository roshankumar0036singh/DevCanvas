import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Save, Eye, Code,
    Heading1, Heading2, Heading3,
    Bold, Italic, Strikethrough,
    Quote, CodeXml, Link as LinkIcon, Image,
    List, CheckSquare, Table, Minus, FileText, Sparkles, Download
} from 'lucide-react';
import AIProcessingOverlay from './AIProcessingOverlay';
import storage from '../../utils/storage';
import { parseMarkdown } from '../../utils/markdown';
import type { Document } from '../../utils/storage';
import { DOCUMENT_TEMPLATES } from '../../utils/templates';
import 'highlight.js/styles/github-dark.css';

interface DocumentEditorProps {
    documentId: string | null;
    onBack: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, onBack }) => {
    const [document, setDocument] = useState<Document | null>(null);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('Untitled Document');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(true);

    const [showTemplates, setShowTemplates] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);

    const [showExport, setShowExport] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const [aiInstruction, setAiInstruction] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        loadDocument();
    }, [documentId]);

    // Auto-save every 2 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (document && (content !== document.content || title !== document.title)) {
                handleSave();
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [content, title]);

    const loadDocument = async () => {
        setLoading(true);
        if (documentId) {
            const docs = await storage.getDocuments();
            const doc = docs.find(d => d.id === documentId);
            if (doc) {
                setDocument(doc);
                setContent(doc.content);
                setTitle(doc.title);
            }
        } else {
            // New document
            const newDoc = await storage.addDocument({
                title: 'Untitled Document',
                content: '# Welcome to DevCanvas\n\nStart writing your documentation here...',
                tags: [],
            });
            setDocument(newDoc);
            setContent(newDoc.content);
            setTitle(newDoc.title);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!document) return;

        setSaving(true);
        await storage.updateDocument(document.id, {
            title,
            content,
            updatedAt: Date.now(),
        });
        setSaving(false);
    };

    const handleTemplateSelect = (templateContent: string) => {
        if (content.length > 50) {
            setPendingTemplate(templateContent);
            setShowConfirmModal(true);
            return;
        }
        setContent(templateContent);
        setShowTemplates(false);
    };

    const confirmTemplateLoad = () => {
        if (pendingTemplate) {
            setContent(pendingTemplate);
        }
        setPendingTemplate(null);
        setShowConfirmModal(false);
        setShowTemplates(false);
    };

    const handleCancelTemplateLoad = () => {
        setPendingTemplate(null);
        setShowConfirmModal(false);
    };

    const handleExport = (type: 'md' | 'html' | 'pdf') => {
        if (!document) return;
        const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        if (type === 'md') {
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${filename}.md`;
            a.click();
        } else if (type === 'html') {
            const html = `
<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<style>body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; } img { max-width: 100%; } pre { background: #f4f4f4; padding: 15px; overflow-x: auto; } blockquote { border-left: 4px solid #ddd; padding-left: 15px; color: #666; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f4f4f4; }</style>
</head>
<body>
${parseMarkdown(content)}
</body>
</html>`;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${filename}.html`;
            a.click();
        } else if (type === 'pdf') {
            // Simple print-to-pdf via browser
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
<html>
<head><title>${title}</title>
<style>body { font-family: sans-serif; padding: 20px; } img { max-width: 100%; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 8px; }</style>
</head>
<body>${parseMarkdown(content)}</body>
</html>`);
                printWindow.document.close();
                printWindow.print();
            }
        }
        setShowExport(false);
    };

    const handleAIAssist = async () => {
        if (!aiInstruction.trim()) return;

        setAiLoading(true);
        try {
            const settings = await storage.getSettings();
            // Dynamic import to avoid circular deps if any
            const { assistDocumentation } = await import('../../utils/aiService');

            const updatedContent = await assistDocumentation(content, aiInstruction, settings);
            setContent(updatedContent);
            setShowAI(false);
            setAiInstruction('');
        } catch (error: any) {
            alert('AI Error: ' + error.message);
        } finally {
            setAiLoading(false);
        }
    };

    const insertMarkdown = (syntax: string, placeholder: string = '') => {
        const textarea = window.document.querySelector('textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end) || placeholder;

        let newText = '';
        let cursorOffset = 0;

        switch (syntax) {
            case 'bold':
                newText = `**${selectedText}**`;
                cursorOffset = 2;
                break;
            case 'italic':
                newText = `*${selectedText}*`;
                cursorOffset = 1;
                break;
            case 'code':
                newText = `\`${selectedText}\``;
                cursorOffset = 1;
                break;
            case 'link':
                newText = `[${selectedText}](url)`;
                cursorOffset = selectedText.length + 3;
                break;
            case 'h1':
                newText = `# ${selectedText}`;
                cursorOffset = 2;
                break;
            case 'h2':
                newText = `## ${selectedText}`;
                cursorOffset = 3;
                break;
            case 'list':
                newText = `- ${selectedText}`;
                cursorOffset = 2;
                break;
            case 'h3':
                newText = `### ${selectedText}`;
                cursorOffset = 4;
                break;
            case 'quote':
                newText = `> ${selectedText}`;
                cursorOffset = 2;
                break;
            case 'checklist':
                newText = `- [ ] ${selectedText}`;
                cursorOffset = 6;
                break;
            case 'strikethrough':
                newText = `~~${selectedText}~~`;
                cursorOffset = 2;
                break;
            case 'hr':
                newText = `\n---\n`;
                cursorOffset = 5;
                break;
            case 'table':
                newText = `\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n`;
                cursorOffset = 64;
                break;
            case 'image':
                newText = `![Alt text](image_url)`;
                cursorOffset = 12;
                break;
            default:
                return;
        }

        const newContent = content.substring(0, start) + newText + content.substring(end);
        setContent(newContent);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + selectedText.length);
        }, 0);
    };

    if (loading) {
        return (
            <div className="document-editor loading">
                <div className="spinner"></div>
            </div>
        );
    }

    const htmlContent = parseMarkdown(content);

    return (
        <div className="document-editor">
            {aiLoading && <AIProcessingOverlay message="Genie is writing..." />}
            <div className="editor-header">
                <button className="btn-back" onClick={onBack}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <input
                    type="text"
                    className="doc-title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document Title"
                />
                <div className="editor-actions">
                    <button
                        className="btn-action"
                        onClick={() => setShowTemplates(!showTemplates)}
                        title="Templates"
                    >
                        <FileText size={18} />
                    </button>
                    <button
                        className="btn-action"
                        onClick={() => setShowAI(!showAI)}
                        title="AI Assistant"
                    >
                        <Sparkles size={18} />
                    </button>
                    <button
                        className="btn-action"
                        onClick={() => setShowExport(!showExport)}
                        title="Export"
                    >
                        <Download size={18} />
                    </button>

                    <div className="divider"></div>

                    <button
                        className="btn-toggle-preview"
                        onClick={() => setShowPreview(!showPreview)}
                        title={showPreview ? 'Hide Preview' : 'Show Preview'}
                    >
                        {showPreview ? <Code size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                        className="btn-save"
                        onClick={handleSave}
                        disabled={saving}
                        title="Save (Auto-saves every 2s)"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Templates Modal */}
            {showTemplates && (
                <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Choose a Template</h3>
                        </div>
                        <div className="template-list">
                            {DOCUMENT_TEMPLATES.map((t) => (
                                <button key={t.id} className="template-item" onClick={() => handleTemplateSelect(t.content)}>
                                    <div className="template-icon">
                                        <FileText size={20} />
                                    </div>
                                    <div className="template-info">
                                        <div className="template-name">{t.name}</div>
                                        <div className="template-desc">{t.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary full-width" onClick={() => setShowTemplates(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-overlay" onClick={handleCancelTemplateLoad}>
                    <div className="modal-content small" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Replace Content?</h3>
                        </div>
                        <div className="modal-body" style={{ padding: '0 16px 16px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            <p>This will replace your current document content with the selected template. This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleCancelTemplateLoad}>Cancel</button>
                            <button className="btn-primary" style={{ background: 'var(--danger)', color: 'white' }} onClick={confirmTemplateLoad}>Replace</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExport && (
                <div className="modal-overlay" onClick={() => setShowExport(false)}>
                    <div className="modal-content small" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Export Document</h3>
                        </div>
                        <div className="export-options">
                            <button className="export-option-btn" onClick={() => handleExport('md')}>
                                <FileText size={20} />
                                <div className="option-text">
                                    <div className="option-title">Markdown</div>
                                    <div className="option-desc">.md file</div>
                                </div>
                            </button>
                            <button className="export-option-btn" onClick={() => handleExport('html')}>
                                <CodeXml size={20} />
                                <div className="option-text">
                                    <div className="option-title">HTML</div>
                                    <div className="option-desc">.html file</div>
                                </div>
                            </button>
                            <button className="export-option-btn" onClick={() => handleExport('pdf')}>
                                <Download size={20} />
                                <div className="option-text">
                                    <div className="option-title">PDF</div>
                                    <div className="option-desc">Print view</div>
                                </div>
                            </button>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary full-width" onClick={() => setShowExport(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Assistant Modal */}
            {showAI && (
                <div className="modal-overlay" onClick={() => setShowAI(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={18} className="text-brand" style={{ color: 'var(--brand-solid)' }} />
                                <h3>AI Writing Assistant</h3>
                            </div>
                        </div>
                        <div className="modal-body" style={{ padding: '0 16px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Ask the AI to improve, expand, or summarize your documentation.
                            </p>
                            <textarea
                                className="ai-input-area"
                                value={aiInstruction}
                                onChange={(e) => setAiInstruction(e.target.value)}
                                placeholder="Example: Fix grammar and make the tone more professional..."
                                rows={4}
                            />
                            <div className="ai-quick-actions">
                                <button className="btn-chip" onClick={() => setAiInstruction('Fix grammar and spelling')}>
                                    <CheckSquare size={14} /> Fix Grammar
                                </button>
                                <button className="btn-chip" onClick={() => setAiInstruction('Summarize this document')}>
                                    <FileText size={14} /> Summarize
                                </button>
                                <button className="btn-chip" onClick={() => setAiInstruction('Expand on the technical details')}>
                                    <List size={14} /> Expand
                                </button>
                                <button className="btn-chip" onClick={() => setAiInstruction('Make the tone more professional')}>
                                    <Sparkles size={14} /> Professional Tone
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowAI(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAIAssist} disabled={aiLoading}>
                                {aiLoading ? 'Processing...' : 'Enhance Text'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="editor-toolbar">
                <button onClick={() => insertMarkdown('h1', 'Heading 1')} title="Heading 1"><Heading1 size={18} /></button>
                <button onClick={() => insertMarkdown('h2', 'Heading 2')} title="Heading 2"><Heading2 size={18} /></button>
                <button onClick={() => insertMarkdown('h3', 'Heading 3')} title="Heading 3"><Heading3 size={18} /></button>
                <div className="toolbar-separator"></div>
                <button onClick={() => insertMarkdown('bold', 'bold text')} title="Bold"><Bold size={18} /></button>
                <button onClick={() => insertMarkdown('italic', 'italic text')} title="Italic"><Italic size={18} /></button>
                <button onClick={() => insertMarkdown('strikethrough', 'text')} title="Strikethrough"><Strikethrough size={18} /></button>
                <div className="toolbar-separator"></div>
                <button onClick={() => insertMarkdown('quote', 'quote')} title="Quote"><Quote size={18} /></button>
                <button onClick={() => insertMarkdown('code', 'code')} title="Inline Code"><CodeXml size={18} /></button>
                <button onClick={() => insertMarkdown('link', 'link text')} title="Link"><LinkIcon size={18} /></button>
                <button onClick={() => insertMarkdown('image', 'image_url')} title="Image"><Image size={18} /></button>
                <div className="toolbar-separator"></div>
                <button onClick={() => insertMarkdown('list', 'list item')} title="List"><List size={18} /></button>
                <button onClick={() => insertMarkdown('checklist', 'item')} title="Checklist"><CheckSquare size={18} /></button>
                <button onClick={() => insertMarkdown('table', '')} title="Table"><Table size={18} /></button>
                <button onClick={() => insertMarkdown('hr', '')} title="Horizontal Rule"><Minus size={18} /></button>
            </div>

            <div className={`editor-content ${showPreview ? 'split' : 'full'}`}>
                <div className="editor-pane">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your markdown here..."
                        spellCheck={false}
                    />
                </div>
                {showPreview && (
                    <div className="preview-pane">
                        <div
                            className={`markdown-preview ${document?.tags?.includes('pr-review') ? 'pr-review-mode' : ''}`}
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentEditor;
