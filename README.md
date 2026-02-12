<div align="center">
  <br />
  
  <h1 style="border-bottom: none; font-size: 3.5rem; letter-spacing: -2px;">
    { DevCanvas }
  </h1>
  <p style="font-size: 1.25rem;">
    <strong><code>VISUALIZE</code></strong> • <strong><code>AUDIT</code></strong> • <strong><code>DOCUMENT</code></strong>
  </p>
  
  <br />

  <p align="center">
    <a href="https://github.com/roshankumar0036singh/DevCanvas/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/roshankumar0036singh/DevCanvas/ci.yml?style=flat-square&logo=github-actions&label=build" alt="Build Status">
    </a>
    <a href="https://www.npmjs.com/package/devcanvas">
      <img src="https://img.shields.io/github/package-json/v/roshankumar0036singh/DevCanvas?style=flat-square&logo=npm&color=red" alt="Version">
    </a>
    <a href="https://github.com/roshankumar0036singh/DevCanvas/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/roshankumar0036singh/DevCanvas?style=flat-square&color=orange" alt="License">
    </a>
    <a href="https://github.com/roshankumar0036singh/DevCanvas/stargazers">
      <img src="https://img.shields.io/github/stars/roshankumar0036singh/DevCanvas?style=flat-square&logo=github&color=gold" alt="Stars">
    </a>
    <br>
    <a href="https://github.com/roshankumar0036singh/DevCanvas/commits/main">
      <img src="https://img.shields.io/github/last-commit/roshankumar0036singh/DevCanvas?style=flat-square&logo=github&color=important" alt="Last Commit">
    </a>
    <a href="https://github.com/roshankumar0036singh/DevCanvas">
      <img src="https://img.shields.io/github/languages/code-size/roshankumar0036singh/DevCanvas?style=flat-square&logo=github&color=blue" alt="Code Size">
    </a>
    <br>
    <a href="https://reactjs.org/">
      <img src="https://img.shields.io/badge/Stack-React-20232a.svg?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/Stack-TypeScript-007ACC.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    </a>
    <a href="https://webpack.js.org/">
      <img src="https://img.shields.io/badge/Stack-Webpack-8DD6F9.svg?style=flat-square&logo=webpack&logoColor=black" alt="Webpack">
    </a>
  </p>

  <p align="center">
    <b><a href="#features">Features</a></b>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <b><a href="#installation">Installation</a></b>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <b><a href="#usage">Usage</a></b>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <b><a href="./DOCS/index.md">Docs</a></b>
  </p>
  <br />
</div>

---

<a id="overview"></a>
## 🚀 Mission

**DevCanvas** transforms GitHub repositories into interactive visual maps. It eliminates the cognitive load of navigating large codebases by converting file trees into clear, logical diagrams.

Whether you're **onboarding** to a legacy project, **reviewing** a complex PR, or **documenting** architecture for stakeholders, DevCanvas provides the visual context you need.

---

<a id="features"></a>
## ✨ Core Capabilities

### �️ Visual Architecture
Turn static file lists into dynamic, interactive diagrams.
- **Flowcharts**: Auto-generate execution paths for functions.
- **Class Maps**: Visualize inheritance and object relationships.
- **Sequence Flows**: Trace component interactions chronologically.

### 🛡️ Smart Health Audits
Proactively identify and resolve technical debt.
- **Circular Check**: Detect dangerous import cycles instantly.
- **Security Scan**: Highlight potential vulnerabilities (e.g., `eval()`, secrets).
- **Code Heatmap**: Visualize complexity hot-spots in your architecture.

### 💬 RAG Intelligence
Chat with your codebase using Retrieval Augmented Generation.
- **Deep Context**: Indexes your repo to answer "How does X work?".
- **Code-Aware**: Understands function signatures and dependencies.
- **Link Resolution**: Click citations to jump directly to the source file.

### 📝 Automated Documentation
Generate professional documentation with one click.
- **Exports**: Save diagrams as PNG, SVG, or Mermaid code.
- **Templates**: Use pre-built templates for PRDs, ADRs, and more.
- **Repo Maps**: Export the entire file structure as a navigable map.

---

<a id="ai-providers"></a>
## � AI Engine Support

DevCanvas connects to your preferred LLM provider for analysis.

| Provider | Supported Models | Badge |
| :--- | :--- | :--- |
| **OpenAI** | GPT-4o, GPT-3.5-Turbo | <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" /> |
| **Mistral** | Large, Medium, Small | <img src="https://img.shields.io/badge/Mistral-FD6F00?style=flat-square&logo=mistral&logoColor=white" /> |
| **Anthropic** | Claude 3.5 Sonnet, 3 Opus | <img src="https://img.shields.io/badge/Anthropic-D19C4C?style=flat-square&logo=anthropic&logoColor=white" /> |
| **Google** | Gemini 1.5 Pro | <img src="https://img.shields.io/badge/Google-4285F4?style=flat-square&logo=google&logoColor=white" /> |
| **Groq** | LLaMA 3 70B (Fast) | <img src="https://img.shields.io/badge/Groq-000000?style=flat-square&logo=groq&logoColor=white" /> |

---

---

<a id="installation"></a>
## 📦 Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/roshankumar0036singh/DevCanvas.git
   cd DevCanvas
   npm install
   ```

2. **Build Extension**
   ```bash
   npm run build:dev
   ```

3. **Load in Chrome**
   - Go to `chrome://extensions/` > Enable **Developer Mode**.
   - Click **Load unpacked** > Select `dist/` folder.

---

<a id="usage"></a>
## 🕹️ Usage

1. **Open GitHub Repo**: Navigate to any repository page.
2. **Launch DevCanvas**: Click the extension icon or use the keyboard shortcut (Cmd/Ctrl+Shift+U).
3. **Select Mode**:
   - **Diagram**: View file structure.
   - **Health**: See audit report.
   - **Chat**: Ask RAG questions.
4. **Export**: Save diagrams as PNG, SVG, or Mermaid code.

---

<a id="documentation"></a>
## 📚 Documentation

Detailed documentation is available in the [`DOCS`](./DOCS) directory:

- [**Architecture Overview**](./DOCS/ARCHITECTURE.md)
- [**Extension API**](./DOCS/EXTENSION_API.md)
- [**RAG System**](./DOCS/RAG_SYSTEM.md)

---

## 🤝 Contributing

We love contributions! Please read our [**Contributing Guide**](./CONTRIBUTING.md) to get started.<div align="center">
  <img src="https://contrib.rocks/image?repo=roshankumar0036singh/DevCanvas" alt="Contributors" />
</div>

---

<!-- Commit #1: feat(core): initialize project structure - 2026-02-12T03:36:19.290Z -->

<!-- Commit #2: docs: update README with detailed usage instructions - 2026-02-12T04:15:35.705Z -->

<!-- Commit #3: chore: update roadmap - 2026-02-12T03:36:19.627Z -->

<!-- Commit #10: docs: reference new auth API - 2026-02-12T03:36:20.665Z -->
