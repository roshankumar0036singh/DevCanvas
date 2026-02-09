import { marked } from 'marked';
import hljs from 'highlight.js';

// Type for marked parser context
interface MarkedParser {
    parser: {
        parseInline(tokens: unknown[]): string;
    };
}

// Configure marked with custom renderer
marked.use({
    renderer: {
        // Custom code block renderer
        code({ text, lang }: { text: string; lang?: string }) {
            const validLanguage = hljs.getLanguage(lang || '') ? lang : 'plaintext';
            const highlighted = hljs.highlight(text, { language: validLanguage || 'plaintext' }).value;
            return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
        },
        // Custom link renderer (open in new tab)
        // 'this' context implies Parser
        link(this: MarkedParser, { href, title, tokens }: { href: string; title?: string | null; tokens: unknown[] }) {
            const text = this.parser.parseInline(tokens);
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
        },
        // Custom image renderer to ensure max-width
        image({ href, title, text }: { href: string; title?: string | null; text: string }) {
            const titleAttr = title ? ` title="${title}"` : '';
            const altAttr = text ? ` alt="${text}"` : '';
            return `<img src="${href}"${altAttr}${titleAttr} style="max-width: 100%; height: auto; border-radius: 6px;" />`;
        }
    },
    gfm: true,
    breaks: true,
    pedantic: false,
});

/**
 * Parse markdown to HTML
 */
export function parseMarkdown(markdown: string): string {
    try {
        return marked.parse(markdown) as string;
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return '<p>Error parsing markdown</p>';
    }
}

/**
 * Extract mermaid code blocks from markdown
 */
export function extractMermaidBlocks(markdown: string): Array<{ code: string; index: number }> {
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    const blocks: Array<{ code: string; index: number }> = [];
    let match;
    let index = 0;

    while ((match = mermaidRegex.exec(markdown)) !== null) {
        blocks.push({
            code: match[1].trim(),
            index: index++,
        });
    }

    return blocks;
}

/**
 * Replace mermaid blocks with placeholder divs for rendering
 */
export function replaceMermaidBlocks(markdown: string): string {
    let index = 0;
    return markdown.replace(/```mermaid\n([\s\S]*?)```/g, () => {
        return `<div class="mermaid-diagram" data-index="${index++}"></div>`;
    });
}

/**
 * Sanitize markdown for safe rendering
 */
export function sanitizeMarkdown(markdown: string): string {
    // Basic XSS prevention - remove script tags
    return markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * Get markdown statistics
 */
export function getMarkdownStats(markdown: string): {
    words: number;
    characters: number;
    lines: number;
    headings: number;
    codeBlocks: number;
} {
    const words = markdown.split(/\s+/).filter(w => w.length > 0).length;
    const characters = markdown.length;
    const lines = markdown.split('\n').length;
    const headings = (markdown.match(/^#{1,6}\s/gm) || []).length;
    const codeBlocks = (markdown.match(/```/g) || []).length / 2;

    return { words, characters, lines, headings, codeBlocks };
}

export default {
    parseMarkdown,
    extractMermaidBlocks,
    replaceMermaidBlocks,
    sanitizeMarkdown,
    getMarkdownStats,
};
