const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../src/content/overlay.css');

try {
    let content = fs.readFileSync(cssPath, 'utf8');

    // Replace :root with .devcanvas-root
    content = content.replace(/:root/g, '.devcanvas-root');

    // Replace body { with .devcanvas-root {
    content = content.replace(/body\s*\{/g, '.devcanvas-root {');

    // Replace * { with .devcanvas-root * { (optional but safer)
    // content = content.replace(/\*\s*\{/g, '.devcanvas-root * {');

    fs.writeFileSync(cssPath, content);
    console.log('Successfully updated overlay.css');
} catch (error) {
    console.error('Error updating CSS:', error);
}
