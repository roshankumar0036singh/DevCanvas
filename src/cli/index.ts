
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getRepoStructure, getFileContext } from '../utils/fileSystem';
import { visualizeRepository } from '../utils/aiService';
import { ingestCodebase } from '../utils/rag/ingestion';
import { queryCodebase } from '../utils/rag/retrieval';
import { Settings } from '../utils/storage';

// Load environment variables
dotenv.config();

const program = new Command();

const banner = `
\x1b[32m
  ____             _____                      
 |  _ \\  ___  __ _|___ /  __ _ _ __   
 | | | |/ _ \\/ _\` | |_ \\ / _\` | '_ \\  
 | |_| |  __/ (_| |___) | (_| | | | | 
 |____/ \\___|\\__,_|____/ \\__,_|_| |_| 
                                      
  DevCanvas CLI v0.2.0 - Automated Diagram Generation & RAG
\x1b[0m
`;

console.log(banner);

program
    .name('devcanvas')
    .description('DevCanvas CLI - Automated Diagram Generation & RAG')
    .version('0.2.0');

program
    .command('chat <question>')
    .description('Ask a question about your codebase')
    .action(async (question) => {
        try {
            const pineconeKey = process.env.PINECONE_API_KEY;
            const openaiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || process.env.MISTRAL_API_KEY;
            const provider = process.env.AI_PROVIDER || 'openai';

            if (!pineconeKey || !openaiKey) {
                console.error('Error: PINECONE_API_KEY and AI_API_KEY are required in .env');
                process.exit(1);
            }

            const answer = await queryCodebase(question, {
                pineconeApiKey: pineconeKey,
                openaiApiKey: openaiKey,
                aiProvider: provider as any
            });

            console.log('\n--- Answer ---\n');
            console.log(answer);
            console.log('\n--------------\n');

        } catch (error) {
            console.error('Chat failed:', error);
            process.exit(1);
        }
    });

program
    .command('ingest')
    .description('Ingest codebase into Vector DB for RAG')
    .option('-p, --path <path>', 'Path to source code', '.')
    .option('--exclude <patterns...>', 'Glob patterns to exclude', [])
    .action(async (options) => {
        try {
            console.log(`Ingesting codebase at: ${options.path}`);
            const rootDir = path.resolve(options.path);

            if (!fs.existsSync(rootDir)) {
                console.error(`Error: Directory not found: ${rootDir}`);
                process.exit(1);
            }

            const pineconeKey = process.env.PINECONE_API_KEY;
            const provider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'mistral';
            let apiKey = process.env.OPENAI_API_KEY;

            if (provider === 'mistral') {
                apiKey = process.env.MISTRAL_API_KEY;
            } else if (provider === 'openai') {
                apiKey = process.env.OPENAI_API_KEY;
            }

            if (!pineconeKey || !apiKey) {
                console.error(`Error: PINECONE_API_KEY and API Key for ${provider} are required in .env`);
                process.exit(1);
            }

            await ingestCodebase(rootDir, {
                pineconeApiKey: pineconeKey,
                aiProvider: provider,
                aiApiKey: apiKey,
                exclude: options.exclude
            });

        } catch (error) {
            console.error('Ingestion failed:', error);
            process.exit(1);
        }
    });

program
    .command('generate')
    .description('Generate a mermaid diagram from codebase')
    .option('-p, --path <path>', 'Path to source code', '.')
    .option('-o, --output <file>', 'Output file path (e.g. docs/diagram.mmd)')
    .option('-t, --type <type>', 'Diagram type (flowchart, sequence, class, state, er, gitGraph, gantt, mindmap)', 'flowchart')
    .option('--task <task>', 'Specific task/question for the diagram', 'Create a comprehensive architectural diagram of this codebase.')
    .option('--exclude <patterns...>', 'Glob patterns to exclude', [])
    .action(async (options) => {
        try {
            console.log(`Analyzing codebase at: ${options.path}`);

            const rootDir = path.resolve(options.path);
            if (!fs.existsSync(rootDir)) {
                console.error(`Error: Directory not found: ${rootDir}`);
                process.exit(1);
            }

            // 1. Get Repository Structure
            console.log('Scanning repository structure...');
            const structure = await getRepoStructure(rootDir, options.exclude);

            // 2. Mock Settings - Read from ENV
            const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY;
            const provider = process.env.AI_PROVIDER || 'openai';

            if (!apiKey) {
                console.error('Error: No API Key found. Please set OPENAI_API_KEY (or ANTHROPIC/GEMINI) in .env');
                process.exit(1);
            }

            const settings: Settings = {
                aiProvider: provider as any,
                apiKeys: {
                    [provider]: apiKey
                },
                theme: 'dark', // Irrelevant for CLI generation but required by type
                autoSync: false,
                defaultDiagramType: 'mermaid'
            };

            // 3. Get Context (Heuristic: Read README and key files if possible? or just let structure define it?)
            // visualizeRepository usually expects `extraContext` to contain file contents.
            // For now, let's just pass README and package.json/go.mod as context IF they exist.
            // A better CLI would allow --context files.

            // Auto-detect key files
            const coreFiles = ['README.md', 'package.json', 'go.mod', 'Cargo.toml', 'requirements.txt'];
            const foundFiles = coreFiles.filter(f => fs.existsSync(path.join(rootDir, f)));

            console.log(`Reading context from: ${foundFiles.join(', ')}`);
            const extraContext = await getFileContext(rootDir, foundFiles);

            // 4. Generate Diagram
            console.log(`Generating ${options.type} diagram with ${provider}...`);
            const mermaidCode = await visualizeRepository(
                structure,
                settings,
                options.type as string, // diagramType
                options.task,           // instruction
                extraContext            // extraContext
            );

            // 5. Output
            if (options.output) {
                const outputPath = path.resolve(options.output);
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                fs.writeFileSync(outputPath, mermaidCode);
                console.log(`Diagram saved to: ${outputPath}`);
            } else {
                console.log('\n--- Generated Mermaid Code ---\n');
                console.log(mermaidCode);
                console.log('\n------------------------------\n');
            }

        } catch (error) {
            console.error('Generation failed:', error);
            process.exit(1);
        }
    });

program.parse();
