import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingTourProps {
  open: boolean;
  onComplete: () => void;
  onClose: () => void;
}

interface TourStep {
  id: string;
  title: string;
  body: string;
  selector: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'top-ribbon',
    title: 'Top ribbon / command bar',
    body: 'This is your main command area for project actions, simulation controls, save/export, and visual modes.',
    selector: '[data-tour="top-ribbon"]',
  },
  {
    id: 'left-library',
    title: 'Left library panel',
    body: 'Drag equipment and assets from the library into the scene. Start simple: Source → Conveyor → Sink.',
    selector: '[data-tour="left-library"]',
  },
  {
    id: 'viewport',
    title: 'Center 3D viewport',
    body: 'Build and inspect layouts in 3D. Select, move, rotate, and align modules directly in this workspace.',
    selector: '[data-tour="viewport-center"]',
  },
  {
    id: 'mouse-navigation',
    title: 'Mouse navigation basics',
    body: 'Right-drag to orbit, wheel to zoom, and middle-drag to pan. Use these controls continuously while modeling.',
    selector: '[data-tour="viewport-center"]',
  },
  {
    id: 'right-properties',
    title: 'Right properties panel',
    body: 'Edit dimensions, heights, flow logic, and appearance. This is where infeed/outfeed and behavior parameters are tuned.',
    selector: '[data-tour="right-properties"]',
  },
  {
    id: 'simulation-controls',
    title: 'Simulation controls',
    body: 'Use play/pause/reset and speed controls here. This section also includes recording settings for presentation videos.',
    selector: '[data-tour="simulation-controls"]',
  },
  {
    id: 'connections-flow',
    title: 'Connect infeed/outfeed and flow',
    body: 'Connect output ports to downstream input ports. Products enter at Source, move through connected equipment, and exit at Sink.',
    selector: '[data-tour="bottom-panel"]',
  },
  {
    id: 'help-support',
    title: 'Help / Support anytime',
    body: 'Use the HELP button to reopen this tour and access the full MetaMech user guide/manual whenever needed.',
    selector: '[data-tour="help-support"]',
  },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ open, onComplete, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = useMemo(() => TOUR_STEPS[stepIndex], [stepIndex]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      setTargetRect(el.getBoundingClientRect());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, step]);

  if (!open) return null;

  const cardW = 340;
  const cardH = 210;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;

  let cardLeft = (vw - cardW) / 2;
  let cardTop = vh - cardH - 24;

  if (targetRect) {
    const rightCandidate = targetRect.right + 14;
    const leftCandidate = targetRect.left - cardW - 14;
    const belowCandidate = targetRect.bottom + 12;
    const aboveCandidate = targetRect.top - cardH - 12;

    if (rightCandidate + cardW <= vw - 12) {
      cardLeft = rightCandidate;
      cardTop = clamp(targetRect.top, 12, vh - cardH - 12);
    } else if (leftCandidate >= 12) {
      cardLeft = leftCandidate;
      cardTop = clamp(targetRect.top, 12, vh - cardH - 12);
    } else if (belowCandidate + cardH <= vh - 12) {
      cardLeft = clamp(targetRect.left, 12, vw - cardW - 12);
      cardTop = belowCandidate;
    } else if (aboveCandidate >= 12) {
      cardLeft = clamp(targetRect.left, 12, vw - cardW - 12);
      cardTop = aboveCandidate;
    }
  }

  const next = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      onComplete();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, pointerEvents: 'auto' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(2,6,23,0.74)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {targetRect && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(0, targetRect.left - 4),
            top: Math.max(0, targetRect.top - 4),
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 10,
            border: '2px solid rgba(34,211,238,0.95)',
            boxShadow: '0 0 0 200vmax rgba(2,6,23,0.35)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          left: cardLeft,
          top: cardTop,
          width: cardW,
          borderRadius: 12,
          border: '1px solid rgba(148,163,184,0.3)',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))',
          boxShadow: '0 16px 34px rgba(0,0,0,0.45)',
          color: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(148,163,184,0.2)',
            padding: '0 10px',
            background: 'rgba(15,23,42,0.5)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', fontFamily: "'Orbitron', monospace", color: '#67e8f9' }}>
            METAMECH ONBOARDING
          </div>
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: '1px solid rgba(148,163,184,0.22)',
              background: 'rgba(2,6,23,0.35)',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Skip tour"
          >
            <X size={12} />
          </button>
        </div>

        <div style={{ padding: '12px 12px 8px' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5 }}>
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{step.title}</h3>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: '#cbd5e1' }}>{step.body}</p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px 12px',
            borderTop: '1px solid rgba(148,163,184,0.16)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.22)',
              background: 'rgba(15,23,42,0.42)',
              color: '#cbd5e1',
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Skip
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.22)',
                background: stepIndex === 0 ? 'rgba(15,23,42,0.22)' : 'rgba(15,23,42,0.42)',
                color: stepIndex === 0 ? '#64748b' : '#cbd5e1',
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 10px',
                cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ChevronLeft size={13} />
              Back
            </button>
            <button
              onClick={next}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(34,211,238,0.45)',
                background: 'rgba(34,211,238,0.18)',
                color: '#67e8f9',
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {stepIndex >= TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
