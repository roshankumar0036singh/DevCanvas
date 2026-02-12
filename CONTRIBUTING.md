# Contributing to DevCanvas

Thank you for your interest in contributing! DevCanvas is built with **React**, **TypeScript**, and **Webpack**, focusing on high-end visual documentation tools.

## Development Setup

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/DevCanvas.git
   cd DevCanvas
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development Build**
   ```bash
   # Build once
   npm run build:dev
   
   # Or watch for changes
   npm run dev
   ```

4. **Code Quality Checks**
   ```bash
   # Run linter
   npm run lint
   
   # Type check
   npm run type-check
   ```

## Technical Standards

- **Language**: All new code must be written in **TypeScript**.
- **Styles**: Use vanilla CSS in `popup.css` or themed component-level CSS.
- **Icons**: We use **Lucide React**. Maintain the premium "Cyber-Hex" aesthetic for any new UI elements.
- **Tone**: Keep PR reviews and AI outputs authoritative and professional.

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Optimization or cleanup
- `chore:` - Tooling/deps changes

## Pull Request Process

1. Open an **Issue** first for significant changes.
2. Ensure `npm run lint` and `npm run type-check` pass.
3. Update the `walkthrough.md` if your change adds new functionality.
4. Provide screenshots/recordings for UI changes.

## License

By contributing, you agree that your contributions will be licensed under the **MIT License**.

<!-- Commit #19: docs: update contribution guidelines - 2026-02-12T03:36:22.019Z -->
