# DevCanvas

> Visual documentation and collaboration browser extension for engineering students

## 🚀 Features

- **Diagram Generation** - Create diagrams using Mermaid.js, PlantUML, and AI
- **Documentation Editor** - Markdown editor with live preview and diagram embedding
- **GitHub Integration** - Analyze repositories and visualize code structure
- **Real-time Collaboration** - Work together with classmates
- **AI-Powered** - Generate diagrams from natural language

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Chrome 88+ or Edge 88+

### Setup

```bash
# Install dependencies
npm install

# Start development mode with hot reload
npm run dev

# Build for production
npm run build
```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### Development Workflow

```bash
# Run development build (watches for changes)
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## 📁 Project Structure

```
devcanvas/
├── public/
│   ├── manifest.json      # Chrome extension manifest
│   └── icons/             # Extension icons
├── src/
│   ├── popup/             # Extension popup UI
│   ├── background/        # Service worker
│   ├── content/           # Content scripts
│   ├── diagrams/          # Diagram rendering
│   ├── editor/            # Documentation editor
│   ├── collaboration/     # Real-time features
│   └── github/            # GitHub integration
├── dist/                  # Build output
└── webpack.config.js      # Build configuration
```

## 🗺️ Roadmap

See [implementation_plan.md](./implementation_plan.md) for detailed development phases.

- [x] Phase 1: Foundation & Setup
- [ ] Phase 2: MVP - Core Extension
- [ ] Phase 3: Diagram Generation
- [ ] Phase 4: Documentation Editor
- [ ] Phase 5: Collaboration
- [ ] Phase 6: AI Integration
- [ ] Phase 7: GitHub Integration
- [ ] Phase 8: Polish & Advanced Features
- [ ] Phase 9: Testing & Deployment

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
