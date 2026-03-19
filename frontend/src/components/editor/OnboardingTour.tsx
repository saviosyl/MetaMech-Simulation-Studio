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

  const cardW = 300;
  const cardH = 188;
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
          background: 'rgba(15,23,42,0.2)',
          backdropFilter: 'blur(1px)',
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
            border: '1px solid rgba(8,145,178,0.55)',
            boxShadow: '0 0 0 200vmax rgba(15,23,42,0.12)',
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
          borderRadius: 11,
          border: '1px solid var(--mm-border-subtle)',
          background: 'color-mix(in oklab, var(--mm-bg-surface) 95%, transparent)',
          boxShadow: 'var(--mm-shadow-sm)',
          color: 'var(--mm-text-primary)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--mm-border-subtle)',
            padding: '0 9px',
            background: 'color-mix(in oklab, var(--mm-bg-panel) 85%, transparent)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", color: 'var(--mm-accent-primary)' }}>
            QUICK TOUR
          </div>
          <button
            onClick={onClose}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: '1px solid var(--mm-border-subtle)',
              background: 'var(--mm-bg-panel)',
              color: 'var(--mm-text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Skip tour"
          >
            <X size={11} />
          </button>
        </div>

        <div style={{ padding: '10px 11px 7px' }}>
          <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>{step.title}</h3>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: 'var(--mm-text-secondary)' }}>{step.body}</p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 11px 10px',
            borderTop: '1px solid var(--mm-border-subtle)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              borderRadius: 7,
              border: '1px solid var(--mm-border-subtle)',
              background: 'var(--mm-bg-panel)',
              color: 'var(--mm-text-secondary)',
              fontSize: 10,
              fontWeight: 600,
              padding: '5px 9px',
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
                borderRadius: 7,
                border: '1px solid var(--mm-border-subtle)',
                background: stepIndex === 0 ? 'color-mix(in oklab, var(--mm-bg-panel) 70%, transparent)' : 'var(--mm-bg-panel)',
                color: stepIndex === 0 ? 'var(--mm-text-disabled)' : 'var(--mm-text-secondary)',
                fontSize: 10,
                fontWeight: 600,
                padding: '5px 9px',
                cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ChevronLeft size={12} />
              Back
            </button>
            <button
              onClick={next}
              style={{
                borderRadius: 7,
                border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 40%, var(--mm-border-subtle))',
                background: 'color-mix(in oklab, var(--mm-accent-primary) 14%, transparent)',
                color: 'var(--mm-accent-primary)',
                fontSize: 10,
                fontWeight: 600,
                padding: '5px 9px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {stepIndex >= TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
