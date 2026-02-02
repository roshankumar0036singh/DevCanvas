import React from 'react';

const App: React.FC = () => {
    return (
        <div className="app">
            <header className="header">
                <h1>DevCanvas</h1>
                <p className="tagline">Visual Documentation & Collaboration</p>
            </header>

            <main className="main">
                <div className="quick-actions">
                    <button className="action-btn primary">
                        <span className="icon">📊</span>
                        <span>New Diagram</span>
                    </button>
                    <button className="action-btn">
                        <span className="icon">📝</span>
                        <span>New Document</span>
                    </button>
                    <button className="action-btn">
                        <span className="icon">🔗</span>
                        <span>Analyze Repo</span>
                    </button>
                </div>

                <div className="recent">
                    <h2>Recent</h2>
                    <p className="empty-state">No recent items yet</p>
                </div>
            </main>

            <footer className="footer">
                <button className="settings-btn">⚙️ Settings</button>
            </footer>
        </div>
    );
};

export default App;
