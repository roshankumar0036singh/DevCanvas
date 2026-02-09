const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = String.raw`C:\Users\Roshan\.gemini\antigravity\brain\4c8d79fc-df76-4bd7-b15b-a45cfca114a0\logo_fresh_v2.svg`;
const outputDir = path.join(__dirname, '../public/icons');

const sizes = [16, 48, 128];

async function generateIcons() {
    try {
        if (!fs.existsSync(svgPath)) {
            console.error(`SVG Source not found at: ${svgPath}`);
            process.exit(1);
        }

        console.log(`Reading SVG from: ${svgPath}`);
        const svgBuffer = fs.readFileSync(svgPath);

        for (const size of sizes) {
            const outputPath = path.join(outputDir, `icon${size}.png`);
            console.log(`Generating ${size}x${size} icon at: ${outputPath}`);

            await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);
        }

        console.log('All icons generated successfully!');
    } catch (error) {
        console.error('Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
