
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getRepoStructure, getFileContext } from '../utils/fileSystem';
import { visualizeRepository } from '../utils/aiService';
import { Settings } from '../utils/storage';

// Load environment variables
dotenv.config();

const program = new Command();

program
    .name('devcanvas')
    .description('DevCanvas CLI - Automated Diagram Generation')
    .version('0.1.0');

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
