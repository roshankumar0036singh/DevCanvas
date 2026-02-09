
export interface FileNode {
    id: string;      // logical id (e.g. path)
    name: string;    // display name
    type: 'file' | 'folder';
    children: FileNode[];
    parent?: FileNode;
}

/**
 * Parses an ASCII tree structure (like 'tree' command output) into a FileNode tree.
 * Handles standard tree characters: ├──, └──, │
 */
export function parseRepoStructure(structure: string): FileNode | null {
    const lines = structure.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return null;

    // Root is usually the first line
    const rootLine = lines[0];
    const rootName = rootLine.trim();

    const root: FileNode = {
        id: rootName, // Use name as ID for root
        name: rootName,
        type: 'folder',
        children: []
    };

    const stack: { node: FileNode, level: number }[] = [];
    stack.push({ node: root, level: -1 }); // Root is level -1 or 0 base?

    // Heuristic: indent level
    // We need to robustly detect indent. 
    // Standard 'tree':
    // ├── file
    // │   └── sub
    // Average 4 chars per level usually.

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Count indent
        // Remove tree characters to find the name
        // ├── = 3 chars + 1 space = 4
        // │   = 3 chars + 1 space = 4
        // └── = 3 chars + 1 space = 4

        // Search for the last tree character part
        const match = line.match(/^([│\s\u2500\u251C\u2514\u2502\t]*)(.*)$/);
        // \u2500 = ─, \u251C = ├, \u2514 = └, \u2502 = │

        if (!match) continue;

        const indentStr = match[1];
        const nameRaw = match[2];

        // Filter out tree markers from name if regex didn't catch all
        const name = nameRaw.replace(/^[├──|└──|│\s]+/, '').trim();

        if (!name) continue;

        // Determine level
        // Standard tree output uses 4 characters per level "│   " or "    "
        // But some might use 2.
        // Let's assume 4 characters per level roughly.
        // Actually, we can compare indent length to previous.

        // VSCode 'tree' output often uses 4 spaces or special chars.
        // Let's count characters.
        const level = indentStr.length / 4;

        // Rounding might be needed if inconsistent
        const depth = Math.round(level);

        const node: FileNode = {
            id: '', // Will calculate full path later
            name: name,
            type: name.includes('.') ? 'file' : 'folder', // Simple heuristic
            children: []
        };

        // Find parent
        // If depth > stack top depth, then stack top is parent
        // If depth == stack top depth, then stack top's parent is parent (sibling)
        // If depth < stack top depth, pop until we find parent (depth - 1)

        // We need a strictly increasing stack of parents? 
        // No, the stack tracks the active path.

        // Logic:
        // We want to find the parent at depth - 1.

        // Adjust stack
        while (stack.length > 0 && stack[stack.length - 1].level >= depth) {
            stack.pop();
        }

        const parent = stack.length > 0 ? stack[stack.length - 1].node : root;

        node.parent = parent;
        node.id = `${parent.id}/${name}`; // Simple path construction
        parent.children.push(node);

        stack.push({ node, level: depth });
    }

    return root;
}

/**
 * flattens the tree into a map for O(1) lookup by ID/Path
 */
export function buildStructureMap(root: FileNode): Map<string, FileNode> {
    const map = new Map<string, FileNode>();

    const traverse = (node: FileNode) => {
        map.set(node.name, node); // Map by simple Name for easier matching with Mermaid IDs
        map.set(node.id, node);   // Map by Full Path too
        node.children.forEach(traverse);
    };


    traverse(root);
    return map;
}

/**
 * Converts a FileNode subtree back into an ASCII tree string.
 * This is useful for passing scoped context to LLMs.
 */
export function stringifyStructNode(node: FileNode, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string {
    let result = '';

    if (!isRoot) {
        const marker = isLast ? '└── ' : '├── ';
        result += `${prefix}${marker}${node.name}\n`;
    } else {
        result += `${node.name}\n`;
    }

    const children = node.children || [];
    const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const isChildLast = i === children.length - 1;
        result += stringifyStructNode(child, childPrefix, isChildLast, false);
    }

    return result;
}
