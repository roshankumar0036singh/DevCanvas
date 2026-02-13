
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = String.raw`C:\Users\Roshan\.gemini\antigravity\brain\4c8d79fc-df76-4bd7-b15b-a45cfca114a0\devcanvas_icon.svg`;
const logoSvgPath = String.raw`C:\Users\Roshan\.gemini\antigravity\brain\4c8d79fc-df76-4bd7-b15b-a45cfca114a0\devcanvas_logo_full.svg`;
const bananaSvgPath = String.raw`C:\Users\Roshan\.gemini\antigravity\brain\4c8d79fc-df76-4bd7-b15b-a45cfca114a0\nano_banana.svg`;
const publicIconsDir = path.resolve(__dirname, '../public/icons');

async function convert() {
    console.log('Converting SVG to PNG...');

    // Ensure directory exists
    if (!fs.existsSync(publicIconsDir)) {
        console.log('Creating directory:', publicIconsDir);
        fs.mkdirSync(publicIconsDir, { recursive: true });
    }

    try {
        // Icon 16x16
        await sharp(svgPath)
            .resize(16, 16)
            .png()
            .toFile(path.join(publicIconsDir, 'icon16.png'));
        console.log('Generated icon16.png');

        // Icon 48x48
        await sharp(svgPath)
            .resize(48, 48)
            .png()
            .toFile(path.join(publicIconsDir, 'icon48.png'));
        console.log('Generated icon48.png');

        // Icon 128x128
        await sharp(svgPath)
            .resize(128, 128)
            .png()
            .toFile(path.join(publicIconsDir, 'icon128.png'));
        console.log('Generated icon128.png');

        // Full Logo
        await sharp(logoSvgPath)
            .resize(800, 200)
            .png()
            .toFile(path.join(publicIconsDir, 'logo-full.png'));
        console.log('Generated logo-full.png');

        // Nano Banana
        await sharp(bananaSvgPath)
            .resize(512, 512)
            .png()
            .toFile(path.join(publicIconsDir, 'nano-banana.png'));
        console.log('Generated nano-banana.png');

    } catch (error) {
        console.error('Error ensuring icons:', error);
    }
}

convert();
