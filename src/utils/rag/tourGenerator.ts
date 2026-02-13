
import { VectorStore } from './vectorStore';
import { generateEmbedding, askCodebase } from '../aiService';
import { Settings } from '../storage';

export interface TourStep {
    nodeId: string;
    stepTitle: string;
    explanation: string;
}

export interface NodeSummary {
    id: string;
    label: string | undefined;
    type?: string;
}

/**
 * Generates a step-by-step code tour based on a natural language query.
 */
export async function generateCodeTour(
    query: string,
    availableNodes: NodeSummary[],
    settings: Settings,
    options: {
        pineconeApiKey?: string;
        repoUrl?: string;
    }
): Promise<TourStep[]> {
    console.log(`🗺️ Generating Code Tour for: "${query}"`);

    // 1. Initialize Vector Store
    const vectorStore = new VectorStore(options.pineconeApiKey);

    // 2. Generate Query Embedding
    console.log('🧠 Generating embedding for tour query...');
    const queryVector = await generateEmbedding(query, settings);

    // 3. Search Vectors for Context
    console.log('📡 Searching Vector DB for context...');
    const matches = await vectorStore.query(queryVector, 5); // Top 5 chunks

    const context = matches.length > 0
        ? matches.map(m => `File: ${m.metadata.filePath}\nContent:\n${m.metadata.content}`).join('\n---\n')
        : "No direct code context found. Rely on node labels.";

    // 4. Construct Prompt
    // Minimize node list to tokens
    const nodesList = availableNodes.map(n => `- ID: "${n.id}", Label: "${n.label || ''}"`).join('\n');

    const systemPrompt = `You are a Senior Software Architect and technical instructor.
Your goal is to explain a specific flow (e.g. "Auth Flow", "Data Processing") by guiding the user through the EXISTING diagram nodes.

CRITICAL INSTRUCTIONS:
1. **Map to Nodes**: You must strictly map your explanation to the provided "Available Nodes". Use the EXACT \`nodeId\`.
2. **Sequence**: Create a logical sequence of steps.
3. **Concise**: Explanations must be short (max 2 sentences) as they appear in a small overlay.
4. **JSON Output**: Return ONLY a valid JSON array of steps.

FORMAT:
[
  {
    "nodeId": "exact_id_from_list",
    "stepTitle": "Short Title (e.g. 'User Login')",
    "explanation": "The flow starts here where..."
  }
]
`;

    const userPrompt = `
CONTEXT from Codebase:
${context}

AVAILABLE DIAGRAM NODES:
${nodesList}

USER QUERY: "${query}"

GENERATE TOUR (JSON ONLY):`;

    // 5. Ask LLM
    // We use a "hack" to repurpose askCodebase or callAI.
    // Since askCodebase uses a specific system prompt, we might need to bypass it or just use it if sufficiently generic.
    // Actually, askCodebase enforces "Answer ONLY based on context".
    // We should probably just call the provider directly OR wrap this in a way that overrides the system prompt.
    // However, looking at aiService.ts, the 'askCodebase' function has a hardcoded system prompt.
    // We should export a raw 'callAI' or generic function.
    // FOR NOW: We will use 'askCodebase' but prepend our instructions to the User Prompt and hope the LLM prioritizes them.
    // Better yet, let's look at 'assistDocumentation' in aiService.ts - it allows more flexible instruction.
    // OR, we can just export a new function in aiService.ts.
    // Let's try to stick to existing tools. 'visualizeLogicFlow' returns mermaid.
    // 'assistDocumentation' takes 'currentContent' + 'instruction'.
    // Let's use 'askCodebase' but be very explicit in the "Question" part to override the behavior,
    // OR modify aiService to export a generic method.
    // Actually, let's modify aiService to export a generic `callAI` or similar if needed.
    // But modifying aiService is risky if I break things.
    // Let's look at `visualizeRepository` - it uses `callOpenAI` deeply.

    // Let's try to use `askCodebase` with a strong override.
    // The `askCodebase` system prompt is: "You are a Senior Software Architect... answer accurate based on context...".
    // That's actually fine. We just need it to output JSON.

    // Let's append the "FORMAT" and "JSON ONLY" to the query passed to askCodebase.


    // Wait, askCodebase wraps the query in its own prompt structure.
    // Context + Query.

    // Let's pass the system instructions as part of the "Query".
    const enhancedQuery = `
    TASK: Generate a JSON Code Tour.
    ${systemPrompt}
    ${userPrompt}
    `;

    console.log('🤖 Asking AI to generate tour...');
    const response = await askCodebase(enhancedQuery, context, settings);

    // 6. Parse JSON
    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("No JSON array found in response");
        }
        const steps = JSON.parse(jsonMatch[0]);
        return steps;
    } catch (e) {
        console.error("Failed to parse Tour JSON", response, e);
        // Fallback: If parsing fails, maybe return a single step generic tour?
        return [];
    }
}
