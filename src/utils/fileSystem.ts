
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Generates an ASCII tree structure of the directory, matching 'tree' command style.
 * This is crucial for `structureParser.ts` to parse correctly.
 */
export async function getRepoStructure(rootDir: string, ignorePatterns: string[] = []): Promise<string> {
    const files = await glob('**/*', {
        cwd: rootDir,
        ignore: ['node_modules/**', '.git/**', ...ignorePatterns],
        nodir: false,
        mark: true // Add slash to directories
    });


    files.sort();

    let output = `${path.basename(rootDir)}\n`;


    const tree: any = {};
    for (const file of files) {
        const parts = file.split('/').filter(p => p);
        let current = tree;
        for (const part of parts) {
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
    }

    // Recursive print
    function printTree(node: any, prefix: string = '') {
        const keys = Object.keys(node).sort();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const isLast = i === keys.length - 1;
            const marker = isLast ? '└── ' : '├── ';
            output += `${prefix}${marker}${key}\n`;

            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            printTree(node[key], childPrefix);
        }
    }

    printTree(tree);
    return output;
}

/**
 * Reads specific files to build context.
 */
export async function getFileContext(rootDir: string, files: string[]): Promise<string> {
    let context = '';
    for (const relativePath of files) {
        const fullPath = path.join(rootDir, relativePath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            context += `\n---\nFile: ${relativePath}\n---\n${content}\n`;
        }
    }
    return context;
}
