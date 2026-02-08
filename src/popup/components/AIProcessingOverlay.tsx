import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIProcessingOverlayProps {
    message?: string;
    subtext?: string;
}

const AIProcessingOverlay: React.FC<AIProcessingOverlayProps> = ({
    message = 'Genie is thinking...',
    subtext = 'This may take a few seconds.'
}) => {
    return (
        <div className="ai-loading-overlay">
            <div className="ai-loading-content">
                <div className="genie-loader-wrapper">
                    <div className="genie-loader-core"></div>
                    <Sparkles className="genie-loader-icon" size={28} />
                </div>
                <div className="ai-loading-message">{message}</div>
                {subtext && <div className="ai-loading-subtext">{subtext}</div>}
            </div>
        </div>
    );
};

export default AIProcessingOverlay;
