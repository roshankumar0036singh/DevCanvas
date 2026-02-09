
const mermaidCode = `gantt
    dateFormat  YYYY-MM-DD
    title Project Timeline
    section Design
    Research           :done,    des1, 2024-01-01, 7d
    Prototyping        :active,  des2, 2024-01-08, 5d
    section Dev
    Backend Impl       :crit, done, dev1, 2024-01-15, 10d
    Frontend Impl      :crit, active, dev2, after dev1, 7d
    section Test
    QA                 :         test1, after dev2, 5d
`;

function parseGantt(mermaidCode) {
    const nodes = [];
    const lines = mermaidCode.split('\n');

    // 1. Parse Tasks
    const tasks = [];
    let currentSection = 'General';

    lines.forEach(line => {
        const trim = line.trim();
        if (!trim || trim.startsWith('gantt') || trim.startsWith('title')) return;
        if (trim.startsWith('dateFormat')) return;

        if (trim.startsWith('section')) {
            currentSection = trim.replace('section', '').trim();
            return;
        }

        const colonParts = trim.split(':');
        if (colonParts.length < 2) return;

        const label = colonParts[0].trim();
        const metaParts = colonParts[1].split(',').map(s => s.trim());

        let status = '';
        let id = `task_${tasks.length}`;
        let start = '';
        let duration = 0;
        let after = '';

        metaParts.forEach(part => {
            if (['active', 'done', 'crit', 'milestone'].includes(part)) {
                status = part;
            } else if (part.match(/^[a-zA-Z0-9_]+$/) && !part.match(/^\d+d$/) && !part.includes('-')) {
                id = part;
            } else if (part.match(/^\d{4}-\d{2}-\d{2}$/)) {
                start = part;
            } else if (part.match(/^\d+d$/)) {
                duration = parseInt(part.replace('d', ''));
            } else if (part.startsWith('after ')) {
                after = part.replace('after ', '').trim();
            }
        });

        console.log(`Parsed Task: ${label}, ID: ${id}, After: ${after}, Status: ${status}`);
        tasks.push({ id, label, status, start, duration, after, section: currentSection });
    });

    // 2. Resolve Dates
    const resolvedTasks = new Map();
    let minTime = Number.MAX_VALUE;
    const sectionMap = new Map();
    let rowIndex = 0;

    tasks.forEach(task => {
        if (!sectionMap.has(task.section)) {
            sectionMap.set(task.section, rowIndex++);
        }
    });

    const resolveTask = (taskId, visited = new Set()) => {
        if (visited.has(taskId)) {
            console.error(`Cycle detected for ${taskId}`);
            return null;
        }
        visited.add(taskId);

        if (resolvedTasks.has(taskId)) return resolvedTasks.get(taskId);

        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            console.error(`Task not found: ${taskId}`);
            return null;
        }

        let startTime = 0;

        if (task.after) {
            const parent = resolveTask(task.after, visited);
            if (parent) {
                startTime = parent.end;
            } else {
                console.error(`Parent not resolved for ${taskId} (after ${task.after})`);
            }
        } else if (task.start) {
            startTime = new Date(task.start).getTime();
        } else {
            startTime = new Date('2024-01-01').getTime();
        }

        if (isNaN(startTime)) startTime = new Date().getTime();

        const endTime = startTime + (task.duration || 1) * 24 * 60 * 60 * 1000;
        const result = { start: startTime, end: endTime, row: sectionMap.get(task.section) || 0 };
        resolvedTasks.set(taskId, result);
        return result;
    };

    tasks.forEach(task => resolveTask(task.id));

    console.log('Resolved Tasks:', Array.from(resolvedTasks.keys()));
    return resolvedTasks;
}

parseGantt(mermaidCode);
