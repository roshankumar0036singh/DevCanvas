
import React from 'react';
import { ArrowLeft, ArrowRight, X, Compass } from 'lucide-react';
import { TourStep } from '../../utils/rag/tourGenerator';

interface TourOverlayProps {
    currentStepIndex: number;
    steps: TourStep[];
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
}

const TourOverlay: React.FC<TourOverlayProps> = ({
    currentStepIndex,
    steps,
    onNext,
    onPrev,
    onClose
}) => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return null;

    const isLastStep = currentStepIndex === steps.length - 1;
    const isFirstStep = currentStepIndex === 0;

    return (
        <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '600px',
            background: '#1c2128',
            backdropFilter: 'blur(20px)',
            border: '1px solid #30363d',
            borderRadius: '12px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 220, 130, 0.1)',
            zIndex: 1000,
            animation: 'tourSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden'
        }}>
            {/* Accent Bar */}
            <div style={{
                height: '3px',
                background: 'linear-gradient(90deg, #00DC82 0%, #0a3d2e 100%)',
                width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                transition: 'width 0.3s ease-out'
            }} />

            <div style={{ padding: '20px 24px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #00DC82 0%, #0a3d2e 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Compass size={20} color="#000" strokeWidth={2.5} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                color: '#c9d1d9',
                                fontWeight: '600',
                                fontSize: '15px',
                                marginBottom: '2px'
                            }}>
                                {currentStep.stepTitle}
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: '#8b949e',
                                fontWeight: '500'
                            }}>
                                Step {currentStepIndex + 1} of {steps.length}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#8b949e',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            marginLeft: '12px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.color = '#c9d1d9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#8b949e';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Explanation */}
                <div style={{
                    color: '#c9d1d9',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    background: '#0d1117',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #21262d',
                    marginBottom: '16px'
                }}>
                    {currentStep.explanation}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onPrev}
                        disabled={isFirstStep}
                        style={{
                            background: isFirstStep ? '#161b22' : '#21262d',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            color: isFirstStep ? '#484f58' : '#c9d1d9',
                            cursor: isFirstStep ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            opacity: isFirstStep ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isFirstStep) {
                                e.currentTarget.style.background = '#30363d';
                                e.currentTarget.style.borderColor = '#484f58';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isFirstStep) {
                                e.currentTarget.style.background = '#21262d';
                                e.currentTarget.style.borderColor = '#30363d';
                            }
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        style={{
                            background: 'linear-gradient(135deg, #00DC82 0%, #0a3d2e 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            color: '#000',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            boxShadow: '0 0 20px rgba(0, 220, 130, 0.4)',
                            transition: 'all 0.2s',
                            minWidth: '100px',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 220, 130, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 220, 130, 0.4)';
                        }}
                    >
                        {isLastStep ? 'Finish' : 'Next'}
                        {!isLastStep && <ArrowRight size={16} />}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes tourSlideUp {
                    from { 
                        opacity: 0; 
                        transform: translate(-50%, 40px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translate(-50%, 0);
                    }
                }
            `}</style>
        </div>
    );
};

export default TourOverlay;
