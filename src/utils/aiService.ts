/**
 * AI Service - Integration with AI providers for README enhancement
 */

import type { Settings } from './storage';

export interface AIProvider {
    name: string;
    apiKey: string;
    model: string;
}

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// Helper for error handling
async function handleAPIError(provider: string, response: Response): Promise<never> {
    let errorMessage = `Unknown error from ${provider}`;
    try {
        const errorData = await response.json();
        // Extract error message based on common API patterns
        errorMessage = errorData.error?.message || errorData.error || errorData.message || JSON.stringify(errorData);
    } catch {
        errorMessage = response.statusText;
    }

    if (response.status === 401 || response.status === 403) {
        throw new Error(`Invalid API Key for ${provider}. Please check your settings.`);
    } else if (response.status === 429) {
        throw new Error(`${provider} Rate Limit Exceeded. Please try again later.`);
    } else if (response.status >= 500) {
        throw new Error(`${provider} Server Error. The service might be down.`);
    }

    throw new Error(`${provider} Error: ${errorMessage}`);
}


/**
 * Enhance README using configured AI provider
 */
export async function enhanceReadme(
    originalReadme: string,
    settings: Settings
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    // Fallback to old key if new one is missing, for backward compatibility during migration
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured. Please set it in Settings.`);
    }

    const prompt = createEnhancementPrompt(originalReadme);

    switch (provider) {
        case 'openai':
            return await callOpenAI(prompt, apiKey);
        case 'anthropic':
            return await callAnthropic(prompt, apiKey);
        case 'gemini':
            return await callGemini(prompt, apiKey);
        case 'groq':
            return await callGroq(prompt, apiKey);
        case 'mistral':
            return await callMistral(prompt, apiKey);
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
}


/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, apiKey: string, isDiagram = false): Promise<string> {
    const systemContent = isDiagram
        ? 'You are a Senior Software Architect and Visualization Expert.'
        : 'You are an expert technical writer specializing in README documentation.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: systemContent,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        await handleAPIError('OpenAI', response);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(prompt: string, apiKey: string, isDiagram = false): Promise<string> {
    const systemContent = isDiagram
        ? 'You are a Senior Software Architect and Visualization Expert.'
        : 'You are an expert technical writer specializing in README documentation.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 4000,
            system: systemContent,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        }),
    });

    if (!response.ok) {
        await handleAPIError('Anthropic', response);
    }

    const data = await response.json();
    return data.content[0].text;
}

/**
 * Call Google Gemini API
 */
async function callGemini(prompt: string, apiKey: string, isDiagram = false): Promise<string> {
    const systemContent = isDiagram
        ? 'You are a Senior Software Architect and Visualization Expert.'
        : 'You are an expert technical writer specializing in README documentation.';

    // Gemini 1.5/2.0 supports system instructions but via a different field or we can just prepend.
    // For simplicity and compatibility, we prepend.
    const fullPrompt = `${systemContent}\n\n${prompt}`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: fullPrompt,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                },
            }),
        }
    );

    if (!response.ok) {
        await handleAPIError('Gemini', response);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ... (Groq and Mistral are mostly fine, just ensuring consistency)

/**
 * Create enhancement prompt for AI header reconstruction
 */
function createEnhancementPrompt(readme: string): string {
    return `You are an expert technical writer. Analyze and reconstruct the following README.md file to be extremely professional.

ORIGINAL README:
\`\`\`markdown
${readme}
\`\`\`

REQUIREMENTS:
Please provide an ENHANCED version with:
1. **Better Structure**: Clear sections (Overview, Features, Installation, Usage, etc.)
2. **Professional Badges**: Add relevant shields.io badges (build status, license, version, etc.)
3. **Improved Installation**: Step-by-step installation instructions
4. **Better Examples**: Clear, practical code examples
5. **Contributing Guidelines**: How to contribute to the project
6. **License Information**: Proper license section
7. **Better Formatting**: Use proper markdown formatting, tables, code blocks
8. **Screenshots/Diagrams**: Suggest where to add visuals (use placeholders)

IMPORTANT:
- Maintain the original project's core information
- Keep the same tone and style
- Only output the enhanced README markdown, no explanations
- Start directly with the markdown content

Also Add :
1. **Badges**: Use the 'for-the-badge' style for shields.io badges. 
   Example: \`<img src="https://img.shields.io/badge/Label-Color?style=for-the-badge&logo=logoName&logoColor=white">\`
   Include badges for: Build, Version, License, and Tech Stack (React, TypeScript, etc.).
2. **Structure**: 
   - Title & Banner
   - Badges Row
   - Short Description
   - Features (Bullet points)
   - Installation (Code blocks)
   - Usage
   - Contributing
   - License
3. **Tone**: Professional, encouraging, and clear.
4. **Formatting**: Use clean Markdown.

IMPORTANT: Output ONLY the raw Markdown code.`;
}

/**
 * Generate Repository Visualization
 */
export async function visualizeRepository(
    fileStructure: string,
    settings: Settings,
    diagramType: string = 'graph TD', // 'graph TD', 'sequenceDiagram', etc.
    instruction?: string,
    extraContext?: string,
    isHealthMap?: boolean
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured.`);
    }

    const customInstruction = instruction ? `\nUSER FOCUS: "${instruction}"` : '';
    const additionalContext = extraContext ? `\nADDITIONAL CODE CONTEXT:\n${extraContext}` : '';

    let taskDescription = `Your goal is to create a high-level ${diagramType} diagram that represents the ARCHITECTURE and LOGICAL FLOW of the repository.`;
    let healthInstructions = '';
    let sequenceInstructions = '';

    if (isHealthMap) {
        taskDescription = `Your goal is to create a **HEALTH HEATMAP** of the repository using a ${diagramType}.`;
        healthInstructions = `
CRITICAL: HEALTH MAP INSTRUCTIONS
1. ANALYZE ACTUAL CODE: Check dependencies, configurations, and README. Do NOT guess health based on folder names.
2. CONFIDENCE SCORE: Only color-code nodes where you have >90% confidence of an issue or optimization. 
3. COLOR-CODE Nodes using Mermaid 'classDef':
   - health-critical: For PROVEN high-risk areas (CVEs, missing critical auth, etc.) - use RED: fill:#EF4444,stroke:#fff,color:#fff
   - health-warning: For verifiable technical debt - use YELLOW/ORANGE: fill:#F59E0B,stroke:#fff,color:#fff
   - health-healthy: For layers with confirmed documentation/coverage - use GREEN: fill:#10B981,stroke:#fff,color:#fff
4. DIRECT COLORING: Apply classes ONLY to repository nodes. Do NOT create floating nodes named "Critical", "Warning", or "Healthy".
5. EVIDENCE IN DIAGRAM: For non-healthy nodes, attach info nodes: (node_id -- "Evidence" --> info_id[Snippet...])
6. Apply classes using: \`class node_id health-critical\`
7. NO SEQUENCE DIAGRAM TOKENS: Do NOT use 'note right of', 'participant', or 'loop'.
8. LEGEND (Optional): If you add a legend, it MUST be inside a \`subgraph Legend_Sub [Legend]\` block at the bottom. Never add orphaned status nodes.`;
    } else if (diagramType === 'sequenceDiagram') {
        taskDescription = `Your goal is to create a **LOGIC FLOW SEQUENCE** of the repository using a sequenceDiagram.`;
        sequenceInstructions = `
CRITICAL: SEQUENCE DIAGRAM RULES
1. ONLY declare 'participant' if it is actively involved in at least one message exchange (A -> B).
2. DO NOT declare a participant at the top just because it exists in the repo.
3. Use 'autonumber' at the start.
4. Group related files into single logical participants (e.g., 'API Layer', 'Storage', 'UI Components') to avoid clutter.
5. Use clear aliases: \`participant P1 as "API Layer"\`.
6. DO NOT use square brackets [] for labels in sequence diagrams. Use "Quotes".`;
    }

    const prompt = `You are a Senior Software Architect. ${taskDescription}

Repo Structure:
${fileStructure}
${additionalContext}
${customInstruction}
${healthInstructions}
${sequenceInstructions}

GOAL: Map the files and folders to logical components or services.

CRITICAL RULES:
1. DO NOT just list every file. Group them into logical blocks or subgraphs.
2. REPRESENT Relationships: Show how components interact.
3. USE Semantic Labels: Use human-readable names like "Auth Service" instead of filenames.
4. INFER from context: Include external services like 'Firebase', 'AWS', or 'Stripe' if mentioned.
5. CRITICAL: Sanitize ALL Node/Class IDs. Use ONLY Alphanumeric + Underscore.
   - Use Labels for display: \`node_id["Logical Name"]\` (CRITICAL: No space before '[').
   - ALWAYS wrap labels in double quotes "", especially if they contain special characters like | (pipes), brackets, or colons.
   - ALWAYS close all brackets and quotes.

IMPORTANT: Return ONLY valid Mermaid code starting with '${diagramType}'. No conversations.`;

    let content = '';
    switch (provider) {
        case 'openai': content = await callOpenAI(prompt, apiKey, true); break;
        case 'anthropic': content = await callAnthropic(prompt, apiKey, true); break;
        case 'gemini': content = await callGemini(prompt, apiKey, true); break;
        case 'groq': content = await callGroq(prompt, apiKey, true); break;
        case 'mistral': content = await callMistral(prompt, apiKey, true); break;
        default: throw new Error(`Unsupported provider: ${provider}`);
    }

    const cleaned = cleanMermaidResponse(content, diagramType);
    return cleaned;
}

/**
 * Identify potential issues in a repository
 */
export async function analyzeRepoIssues(
    fileStructure: string,
    settings: Settings,
    customInstruction?: string,
    extraContext?: string
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured.`);
    }

    const instruction = customInstruction ? `\nUSER FOCUS/INSTRUCTION: "${customInstruction}"` : '';
    const additionalContext = extraContext ? `\nADDITIONAL CODE CONTEXT (README/Package.json):\n${extraContext}` : '';

    const prompt = `You are a Senior Software Engineer and Security Lead.
Your task is to analyze the following repository structure and provided code context to identify ACTUAL issues, logic errors, or missing features.

Repo Structure:
${fileStructure}
${additionalContext}
${instruction}

GOAL: Generate a list of 5-10 technical issues or feature requests.

CRITICAL RULES:
1. USE SOURCE CODE: I have provided the content of several source files labeled as 'CONTENT OF SOURCE_CODE'. You MUST analyze these files deeply to find real logic bugs, security flaws, or performance issues.
2. EVIDENCE REQUIRED: You must only report issues for which you have concrete evidence. Every issue MUST include a 'Proof/Evidence' section. If you have the SOURCE_CODE for a file, cite specific lines.
3. NO HALLUCINATIONS: Do NOT guess bugs based on filenames if you don't have the source content for that file. If you don't have the content, only report structural or dependency issues found in Package/Config files.
4. DO NOT USE README AS PROOF OF BUGS: If the README mentions a feature (e.g. "CSS Variables", "Auth"), but you do not see the implementation in the provided files, DO NOT report it as "Missing Feature" or "Inconsistent Implementation". Assume it exists in files you cannot see. Only report it if you see CONTRADICTORY evidence in the code you HAVE.
5. BE SPECIFIC: Cite filenames and line numbers.
6. STRICTLY FOLLOW the USER FOCUS/INSTRUCTION.

FORMAT:
Each issue must follow this format:

# [Issue Category]: [Descriptive Title]
## Description
[Technical explanation of the issue.]

## Proof/Evidence
[Citing specific code snippets, package versions, or logic flows from the provided context. PROVIDE ACTUAL PROOF.]

## Suggested Fix/Implementation
[Concrete, technical steps to address this]

---

IMPORTANT: Return ONLY the Markdown document. No conversational text.`;

    let content = '';
    switch (provider) {
        case 'openai': content = await callOpenAI(prompt, apiKey); break;
        case 'anthropic': content = await callAnthropic(prompt, apiKey); break;
        case 'gemini': content = await callGemini(prompt, apiKey); break;
        case 'groq': content = await callGroq(prompt, apiKey); break;
        case 'mistral': content = await callMistral(prompt, apiKey); break;
        default: throw new Error(`Unsupported provider: ${provider}`);
    }

    return content;
}

/**
 * Identify issues specific to a folder/component
 */
export async function analyzeFolderIssues(
    folderPath: string,
    fileStructure: string,
    settings: Settings,
    extraContext?: string
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured.`);
    }

    const additionalContext = extraContext ? `\nADDITIONAL CODE CONTEXT (README/Source Files):\n${extraContext}` : '';

    const prompt = `You are a Senior Software Engineer specializing in the component: "${folderPath}".
Your task is to analyze the logic, security, and performance of this specific folder based on the provided file structure and source code.

Target Folder: ${folderPath}
Structure in view:
${fileStructure}
${additionalContext}

GOAL: Identify exactly 5 high-impact technical issues or improvements for THIS FOLDER ONLY.

CRITICAL RULES:
1. FOCUS ON LOGIC: Analyze provided 'SOURCE_CODE' contents for real bugs.
2. EVIDENCE REQUIRED: Cite specific lines from the provided source files. 
3. NO GENERIC ADVICE: Do NOT give general best practices. Give concrete, project-specific proof.
4. If you don't have enough source code context to find 5 real bugs, report fewer (but at least 1) rather than hallucinating.

FORMAT:
# [Bug/Improvement]: [Title]
## Description
[Technical explanation]

## Proof/Evidence
[Cite lines from SOURCE_CODE or structural inconsistencies]

## Suggested Fix
[Technical steps]

---

IMPORTANT: Return ONLY the Markdown document. No conversational text.`;

    let content = '';
    switch (provider) {
        case 'openai': content = await callOpenAI(prompt, apiKey); break;
        case 'anthropic': content = await callAnthropic(prompt, apiKey); break;
        case 'gemini': content = await callGemini(prompt, apiKey); break;
        case 'groq': content = await callGroq(prompt, apiKey); break;
        case 'mistral': content = await callMistral(prompt, apiKey); break;
        default: throw new Error(`Unsupported provider: ${provider}`);
    }

    return content;
}

function cleanMermaidResponse(text: string, expectedType?: string): string {
    // Remove markdown code blocks
    const cleaned = text.replace(/```(?:mermaid|mer|markup|code)?\s*/gi, '').replace(/```\s*/g, '');

    // If expectedType is specific (e.g. 'classDiagram'), simplify it to keyword
    let targetKeywords: string[] = [];

    if (expectedType) {
        if (expectedType.startsWith('graph') || expectedType.startsWith('flowchart')) {
            targetKeywords = ['graph', 'flowchart'];
        } else if (expectedType === 'sequenceDiagram') {
            targetKeywords = ['sequenceDiagram'];
        } else if (expectedType === 'classDiagram') {
            targetKeywords = ['classDiagram'];
        } else if (expectedType === 'stateDiagram' || expectedType === 'stateDiagram-v2') {
            targetKeywords = ['stateDiagram', 'stateDiagram-v2'];
        } else {
            targetKeywords = [expectedType];
        }
    }

    const keywords = [
        'graph TD', 'graph LR', 'graph TB', 'graph BT', 'graph RL',
        'flowchart TD', 'flowchart LR', 'flowchart TB', 'flowchart BT', 'flowchart RL',
        'sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2',
        'erDiagram', 'gantt', 'pie', 'gitGraph', 'journey', 'mindmap',
        'timeline', 'zenuml', 'quadrantChart', 'xychart', 'block-beta',
        'kanban', 'architecture-beta'
    ];

    let startIndex = -1;
    let foundKeyword = '';

    for (const kw of keywords) {
        const idx = cleaned.indexOf(kw);
        if (idx !== -1) {
            if (startIndex === -1 || idx < startIndex) {
                startIndex = idx;
                foundKeyword = kw;
            }
        }
    }

    if (startIndex !== -1) {
        // Validation: If expectedType was specific, does foundKeyword match?
        if (expectedType && targetKeywords.length > 0) {
            const isMatch = targetKeywords.some(tk => foundKeyword.startsWith(tk));
            if (!isMatch) {
                console.warn(`DevCanvas AI: Expected ${expectedType} but found ${foundKeyword}. Rejecting.`);
                return '';
            }
        }

        // Extract the part before diagram type (might contain classDef, etc.)
        const beforeDiagram = cleaned.substring(0, startIndex).trim();
        let fromDiagram = cleaned.substring(startIndex).trim();

        // Fix common Mermaid syntax errors
        // 1. Ensure NO space between node ID and brackets: node_id ["Label"] -> node_id["Label"]
        // This fixes the "got SQS" (Square Bracket Start) parse error.
        fromDiagram = fromDiagram.replace(/([A-Za-z0-9_.-]+)\s+(\[|{|\(|\(\(|\{\{|\[\()/g, '$1$2');

        fromDiagram = fromDiagram.replace(/\|>/g, '-->');
        fromDiagram = fromDiagram.replace(/<\|/g, '<--');

        // Balancer: Ensure all brackets and quotes are closed on each line
        const lines = fromDiagram.split('\n');
        const balancedLines = lines.map(line => {
            let processed = line;
            // Balance quotes (basic)
            const quoteCount = (processed.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0) processed += '"';

            // Balance brackets: [], (), {}
            const pairs = [['[', ']'], ['(', ')'], ['{', '}']];
            pairs.forEach(([open, close]) => {
                const openCount = (processed.match(new RegExp('\\' + open, 'g')) || []).length;
                const closeCount = (processed.match(new RegExp('\\' + close, 'g')) || []).length;
                if (openCount > closeCount) processed += close.repeat(openCount - closeCount);
            });
            return processed;
        });

        // Sequence Diagram specific fixes: Deduplicate participants and declarations
        if (foundKeyword === 'sequenceDiagram') {
            const participantMap = new Set();
            fromDiagram = balancedLines.filter(line => {
                const partMatch = line.match(/^\s*(participant|actor)\s+([A-Za-z0-9_]+)/i);
                if (partMatch) {
                    const id = partMatch[2].toLowerCase();
                    if (participantMap.has(id)) return false;
                    participantMap.add(id);
                }
                return true;
            }).join('\n');
        } else {
            fromDiagram = balancedLines.join('\n');
        }

        // Force-strip Sequence Diagram 'note' tokens if in flowchart/graph mode
        if (foundKeyword.startsWith('graph') || foundKeyword.startsWith('flowchart')) {
            fromDiagram = fromDiagram.replace(/^\s*note\s+(?:right of|left of|over)\s+.+$/gm, '');
        }

        // If there are classDef or style directives before the diagram type, move them after
        if (beforeDiagram && (beforeDiagram.includes('classDef') || beforeDiagram.includes('style '))) {
            // Split the diagram into lines
            const lines = fromDiagram.split('\n');
            const diagramType = lines[0]; // First line is the diagram type
            const rest = lines.slice(1).join('\n');

            // Reconstruct: diagram type, then previous directives, then rest
            return `${diagramType}\n${beforeDiagram}\n${rest}`.trim();
        }

        return fromDiagram;
    }

    // If no valid diagram syntax is found, return empty string to trigger fallback
    return '';
}



/**
 * Call Groq API
 */
async function callGroq(prompt: string, apiKey: string, isDiagram = false): Promise<string> {
    const systemContent = isDiagram
        ? 'You are a Senior Software Architect and Visualization Expert.'
        : 'You are an expert technical writer specializing in README documentation.';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: systemContent,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 32768,
        }),
    });

    if (!response.ok) {
        await handleAPIError('Groq', response);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Call Mistral API
 */
async function callMistral(prompt: string, apiKey: string, isDiagram = false): Promise<string> {
    const systemContent = isDiagram
        ? 'You are a Senior Software Architect and Visualization Expert.'
        : 'You are an expert technical writer specializing in README documentation.';
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'mistral-medium',
            messages: [
                {
                    role: 'system',
                    content: systemContent,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        await handleAPIError('Mistral', response);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Enhance Diagram using configured AI provider
 */
export async function enhanceDiagram(
    currentCode: string,
    diagramType: 'mermaid' | 'plantuml',
    settings: Settings,
    instruction?: string
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured. Please set it in Settings.`);
    }

    const prompt = createDiagramEnhancementPrompt(currentCode, diagramType, instruction);

    switch (provider) {
        case 'openai':
            return await callOpenAI(prompt, apiKey, true);
        case 'anthropic':
            return await callAnthropic(prompt, apiKey, true);
        case 'gemini':
            return await callGemini(prompt, apiKey, true);
        case 'groq':
            return await callGroq(prompt, apiKey, true);
        case 'mistral':
            return await callMistral(prompt, apiKey, true);
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

function createDiagramEnhancementPrompt(code: string, type: 'mermaid' | 'plantuml', instruction?: string): string {
    const customInstruction = instruction ? `\nUSER INSTRUCTION: "${instruction}"\nFollow this instruction strictly.` : '';

    return `You are a Senior Software Architect and Data Visualization Expert.
Your task is to refactor and enhance the following ${type} diagram code to be "Extremely Professional and High-Level".

GOALS:
1. **Professional Layout**: Organize nodes logically (Top-Down or Left-Right) to minimize crossing lines and improve readability.
2. **High-Level Styling**: Use modern colors, rounded corners (if applicable), and consistent stroke widths. Avoid default "ugly" styles.
3. **Clarity**: Ensure node labels are concise but descriptive.
4. **Grouping**: Do NOT use \`subgraph\` syntax unless explicitly requested by the user. Keep the layout flat by default.
   - Only use groups if the user asks to "Group by X" or "Create modules".
5. **Syntax Correctness**: The output MUST be valid ${type} code.
5. **Editable**: Do NOT use complex inline HTML/CSS that breaks standard editors. Use native ${type} styling classes.${customInstruction}

INPUT CODE:
\`\`\`${type}
${code}
\`\`\`

INSTRUCTIONS for MERMAID (if applicable):
- Use \`classDef\` to define a "premium" color palette (e.g., deep blues, soft grays, vibrant accents).
- Apply classes to nodes.
- Use valid node shapes (rect \`[]\`, rounded \`()\`, diamond \`{}\`, cylinder \`[()]\`).
- Use valid node shapes (rect \`[]\`, rounded \`()\`, diamond \`{}\`, cylinder \`[()]\`).
- Ensure the \`style\` syntax is correct.
- CRITICAL: Sanitize IDs. No dots/hyphens in Class Names or Node IDs. Use labels instead.
- ALWAYS use double quotes for labels: node_id["Label Text"].
- CRITICAL: Labels containing pipes | MUST be quoted: node_id["Data | Next"].

SPECIAL INSTRUCTION FOR MIXED DIAGRAMS (App Logic + Database):
- Mermaid DOES NOT support mixing 'graph' and 'erDiagram'.
- If the user asks to add "Database Layer", "Tables", or "Schemas" to a Flowchart:
  1. Keep \`graph TD\` (or LR). Do NOT switch to \`erDiagram\`.
  2. Represent Database/Entities using \`cylinder\` shape: \`db1[(User Table)]\`.
  3. To show detailed Entity Schemas (Headers and Attributes), use a proper HTML <table> inside the cylinder label:
     - Structure: <table><tr><th colspan="2">TABLE_NAME</th></tr><tr><td>attr1</td><td>type</td></tr>...</table>
     - Keep it compact. Use <th> for the table title and <td> for attributes/types.
     - Example: userTable[("<table style='width:100%'><tr><th colspan='2'>Users</th></tr><tr><td>id</td><td>int</td></tr><tr><td>name</td><td>varchar</td></tr></table>")]
  4. RELATIONSHIPS: You MUST connect entities together or to the app logic.
     - Use labels like "FK", "1:N", "Stores", "Retrieves" on edges.
     - Example: userTable -->|1:N| orderTable
     - DO NOT leave database nodes floating; every entity MUST have a connection.

IMPORTANT OUTPUT RULES:
- Return ONLY the raw ${type} code block.
- Do NOT wrap in markdown fences (e.g., no \`\`\`mermaid).
- Do NOT include explanations or text before/after the code.
- If the input is empty or invalid, generate a professional template example.

Refactored Code:`;
}


/**
 * Assist with documentation writing (Expand, Summarize, Fix Grammar, etc.)
 */
export async function assistDocumentation(
    currentContent: string,
    instruction: string,
    settings: Settings
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured.`);
    }

    const systemPrompt = `You are an expert Technical Writer and Editor.
Your goal is to improve the user's documentation based on their instruction.
Maintain a professional, clear, and concise tone.
Output ONLY the replacement text for the selected section (or the whole document if applicable).
Do not include conversational filler like "Here is the updated text:".`;

    const userPrompt = `
CONTEXT (Current Text):
\`\`\`markdown
${currentContent}
\`\`\`

INSTRUCTION:
${instruction}

UPDATED TEXT:`;



    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`; // detailed instruction in user prompt


    switch (provider) {
        case 'openai': return await callOpenAI(fullPrompt, apiKey, false);
        case 'anthropic': return await callAnthropic(fullPrompt, apiKey, false);
        case 'gemini': return await callGemini(fullPrompt, apiKey, false);
        case 'groq': return await callGroq(fullPrompt, apiKey, false);
        case 'mistral': return await callMistral(fullPrompt, apiKey, false);
        default: throw new Error(`Unsupported provider: ${provider}`);
    }
}

/**
 * Logic Flow: Visualizes a complex function's internal logic.
 */
export async function visualizeLogicFlow(
    functionCode: string,
    settings: Settings
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured.`);
    }

    const prompt = `You are a Senior Software Engineer specializing in Logic Visualization.
Your task is to analyze the following code snippet (a function or block of logic) and generate a DETAILED Mermaid 'graph TD' flowchart.

CODE SNIPPET:
\`\`\`
${functionCode}
\`\`\`

GOAL: Map the internal logic paths.

CRITICAL RULES:
1. DETAILED BRANCHING: Every 'if', 'else', 'switch', and 'ternary' must be a decision diamond \`id{Decision}\`.
2. LOOPS: Explicitly show loop entry, body, and exit paths for 'for', 'while', and 'map'.
3. ERROR PATHS: Show 'try/catch' blocks and 'throw' statements.
4. ASYNC FLOW: Use labels like "Await" or "Promise" to show async steps.
5. DATA TRANSFORMATIONS: Represent significant variable changes or data mapping as rectangular nodes.
6. SANITIZATION: Ensure all node IDs are alphanumeric + underscore.
7. QUOTING: ALWAYS wrap labels in double quotes "", especially if they contain special characters like | (pipes).

FORMAT:
Return ONLY valid Mermaid 'graph TD' code. No conversational text.`;

    let content = '';
    switch (provider) {
        case 'openai': content = await callOpenAI(prompt, apiKey, true); break;
        case 'anthropic': content = await callAnthropic(prompt, apiKey, true); break;
        case 'gemini': content = await callGemini(prompt, apiKey, true); break;
        case 'groq': content = await callGroq(prompt, apiKey, true); break;
        case 'mistral': content = await callMistral(prompt, apiKey, true); break;
        default: throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return cleanMermaidResponse(content, 'graph');
}

/**
 * Review a Pull Request diff (Code Rabbit style)
 */
export async function reviewPullRequest(
    diff: string,
    settings: Settings
): Promise<string> {
    const provider = settings.aiProvider || 'openai';
    const apiKey = settings.apiKeys?.[provider] || settings.apiKey;

    if (!apiKey) {
        throw new Error(`API key for ${provider} not configured.`);
    }

    const prompt = `You are a Lead Software Architect and Quality Assurance Specialist.
Your task is to provide a high-level, technical, and executive-style review of the following Git Diff.

GIT DIFF:
\`\`\`diff
${diff}
\`\`\`

GOAL: Provide a structured, audit-grade review report.

CRITICAL RULES:
1. TECHNICAL PRECISION: Cite specific line ranges and files. Use code-blocks for all suggestions.
2. CATEGORIZE: Group findings into these EXACT labels: [Critical: Security], [Defect: Bug], [Optimization: Performance], [Compliance: Style], [Architecture: Refactor], [Enhancement: Suggestion].
3. STRUCTURE: Every finding MUST be an H3 header followed by a list of exactly three items: Location, Analysis, and Proposed Resolution.
4. TONE: Objective and authoritative.

FORMAT:
# Pull Request Audit Report

## Audit Summary
[Concise executive summary of changes]

## Analysis & Findings

### [Category]: [Title]
- **Location**: \`path/to/file.ts:line\`
- **Analysis**: [Deep technical explanation]
- **Proposed Resolution**:
  \`\`\`[language]
  [Code snippet]
  \`\`\`

---
[... Repeat for more findings ...]

## Verification Strategy
[Recommended test protocols]

---
IMPORTANT: Output ONLY the Markdown document.`;

    let content = '';
    switch (provider) {
        case 'openai': content = await callOpenAI(prompt, apiKey); break;
        case 'anthropic': content = await callAnthropic(prompt, apiKey); break;
        case 'gemini': content = await callGemini(prompt, apiKey); break;
        case 'groq': content = await callGroq(prompt, apiKey); break;
        case 'mistral': content = await callMistral(prompt, apiKey); break;
        default: throw new Error(`Unsupported provider: ${provider}`);
    }

    return content;
}

export default {
    enhanceReadme,
    enhanceDiagram,
    visualizeRepository,
    assistDocumentation,
    visualizeLogicFlow,
    reviewPullRequest,
};
