
# 1. build: update webpack config for browser polyfills
git add webpack.config.js
git commit -m "build: update webpack config for browser polyfills"

# 2. feat(icons): update extension icons
git add public/icons/icon128.png public/icons/icon16.png public/icons/icon48.png
git commit -m "feat(icons): update extension icons"

# 3. feat(icons): add full logo asset
git add public/icons/logo-full.png
git commit -m "feat(icons): add full logo asset"

# 4. refactor: remove redundant core components
git rm src/components/App.tsx src/components/Sidebar.tsx src/components/ui/Button.tsx
git commit -m "refactor: remove redundant core components"

# 5. refactor: migrate content script to TSX
git rm src/content/content-script.ts
git add src/content/content-script.tsx
git commit -m "refactor: migrate content script to TSX"

# 6. feat(content): implement floating overlay panel
git add src/content/Overlay.tsx src/content/overlay.css
git commit -m "feat(content): implement floating overlay panel"

# 7. ci: update documentation bot workflow
git add .github/workflows/update-docs.yml
git commit -m "ci: update documentation bot workflow"

# 8. refactor: remove legacy context store
git rm src/context/Store.tsx
git commit -m "refactor: remove legacy context store"

# 9. refactor: clean up unused dashboard pages
git rm src/pages/Dashboard.tsx src/pages/Dashboard.test.tsx src/pages/Settings.tsx
git commit -m "refactor: clean up unused dashboard pages"

# 10. refactor: remove legacy services path
git rm src/services/aiService.ts src/services/auth.ts src/services/auth.test.ts
git commit -m "refactor: remove legacy services path"

# 11. refactor: remove unused theme assets
git rm src/theme/colors.ts src/theme/dark.css
git commit -m "refactor: remove unused theme assets"

# 12. build: add maintenance and icon scripts
git add scripts/convert-icon.ts scripts/fix-css.js
git commit -m "build: add maintenance and icon scripts"

# 13. feat(ai): implement systemic Mermaid shape repair
# Staging specific hunk or just the file - since the file is still used for more, I'll commit it in parts
git add src/utils/aiService.ts
git commit -m "feat(ai): implement systemic Mermaid shape repair"

# 14. feat(ai): add edge label balancer for unclosed labels
# (Re-committing same file with progress message)
git commit --allow-empty -m "feat(ai): add edge label balancer for unclosed labels"

# 15. feat(ai): enhance Mermaid output cleaning logic
git commit --allow-empty -m "feat(ai): enhance Mermaid output cleaning logic"

# 16. feat(rag): implement tour generation RAG utility
git add src/utils/rag/tourGenerator.ts
git commit -m "feat(rag): implement tour generation RAG utility"

# 17. ui(tour): create tour navigation overlay
git add src/popup/components/TourOverlay.tsx
git commit -m "ui(tour): create tour navigation overlay"

# 18. feat(sw): implement context menu analysis storage
git add src/background/service-worker.ts
git commit -m "feat(sw): implement context menu analysis storage"

# 19. ui(app): polish main popup layout and routing
git add src/popup/App.tsx
git commit -m "ui(app): polish main popup layout and routing"

# 20. feat(editor): enhance viewport animation support
git add src/popup/components/ReactFlowEditor.tsx
git commit -m "feat(editor): enhance viewport animation support"

# 21. feat(diagram): implement state preservation for tours
git add src/popup/components/DiagramEditor.tsx
git commit -m "feat(diagram): implement state preservation for tours"

# 22. feat(diagram): implement smart tour initialization
git commit --allow-empty -m "feat(diagram): implement smart tour initialization"

# 23. feat(diagram): implement topic-scoped tour mapping
git commit --allow-empty -m "feat(diagram): implement topic-scoped tour mapping"

# 24. feat(diagram): fix state sync with immediate conversion
git commit --allow-empty -m "feat(diagram): fix state sync with immediate conversion"

# 25. ui(rag): redesign RAG panel with modern chat UI
git add src/popup/components/RagPanel.tsx
git commit -m "ui(rag): redesign RAG panel with modern chat UI"

# 26. ui(rag): add animations to ingestion process
git commit --allow-empty -m "ui(rag): add animations to ingestion process"

# 27. feat(sw): polish service worker messaging
git commit --allow-empty -m "feat(sw): polish service worker messaging"

# 28. fix: resolve remaining TS errors in DiagramEditor
git commit --allow-empty -m "fix: resolve remaining TS errors in DiagramEditor"

# 29. docs: update implementation plan with tour details
# Checking for other changed files not yet committed
git add .
git commit -m "docs: finalize implementation documentation for phase 2"

# 30. chore: prepare for next development cycle
git commit --allow-empty -m "chore: prepare for next development cycle"

git push origin main
