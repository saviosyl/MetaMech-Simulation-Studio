import React, { useMemo, useState } from 'react';
import { X, BookOpen, MousePointer2, Route, PlayCircle, Video, Wrench, LifeBuoy, Sparkles } from 'lucide-react';

type HelpTab = 'guide' | 'support';

interface HelpSupportModalProps {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  bullets: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'what-is',
    title: 'What MetaMech Simulation Studio is',
    icon: <BookOpen size={14} />,
    bullets: [
      'MetaMech Simulation Studio is a professional browser-based engineering tool for designing and simulating industrial material-flow layouts.',
      'Use it to place equipment, connect infeed/outfeed ports, run simulations, validate flow, and create presentation-ready outputs.',
    ],
  },
  {
    id: 'workspace-overview',
    title: 'Workspace overview',
    icon: <Sparkles size={14} />,
    bullets: [
      'Top Ribbon: global actions, simulation controls, recording/export controls, and view options.',
      'Left Library: drag-and-drop equipment and assets by category.',
      'Center Viewport: 3D scene editing, placement, alignment, and path visualization.',
      'Right Properties: precise object parameters, dimensions, logic, and appearance.',
      'Bottom Panel: runtime statistics, validation, and connectivity guidance.',
    ],
  },
  {
    id: 'mouse-controls',
    title: 'Mouse controls (very important)',
    icon: <MousePointer2 size={14} />,
    bullets: [
      'Right-drag: orbit the camera around the scene.',
      'Mouse wheel: zoom in/out.',
      'Middle-drag (or pan gesture): pan the camera.',
      'Left click: select object.',
      'Transform tools (Move / Rotate / Scale): edit selected object position and orientation.',
      'Tip: Use Focus (F) to quickly frame selected equipment.',
    ],
  },
  {
    id: 'place-connect',
    title: 'Placing equipment and connecting nodes',
    icon: <Route size={14} />,
    bullets: [
      'Drag assets from the left library into the viewport to place them.',
      'For process flow, connect equipment output ports to downstream input ports.',
      'Infeed/outfeed consistency matters: products enter at input/infeed and leave at output/outfeed.',
      'Use snapping and alignment tools for cleaner node-to-node connections.',
    ],
  },
  {
    id: 'product-flow',
    title: 'How product in / product out and flow work',
    icon: <PlayCircle size={14} />,
    bullets: [
      'Source nodes create products (product in).',
      'Products travel through connected conveyors/machines according to edges and module logic.',
      'Sink nodes consume finished products (product out).',
      'If nodes are not connected, products cannot reach them; check Bottom Panel validation.',
      'Review infeed/outfeed heights and directions for reliable transfer behavior.',
    ],
  },
  {
    id: 'simulation',
    title: 'Simulation controls and checks',
    icon: <PlayCircle size={14} />,
    bullets: [
      'Use Play/Pause/Reset and simulation speed controls in the top ribbon.',
      'Use Bottom Panel KPIs/Flow/Validation tabs to monitor throughput, blocked states, and errors.',
      'Start with a simple source → conveyor → sink chain, then add machines and controls.',
    ],
  },
  {
    id: 'export-record',
    title: 'Export and recording',
    icon: <Video size={14} />,
    bullets: [
      'Export project scene JSON from File controls for saved layouts.',
      'Use recording controls for viewport video outputs.',
      'Select quality preset and format preference for presentation results.',
      'Camera-path recording gives smooth guided walkthrough videos.',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting and practical tips',
    icon: <Wrench size={14} />,
    bullets: [
      'If flow is stuck, check disconnected-node warnings and edge direction.',
      'If transfers fail, verify infeed/outfeed heights and port orientation.',
      'If the scene feels cluttered, hide overlays/paths and use cleaner camera views.',
      'For onboarding refresh, click “Start Guided Tour” from this Help panel.',
    ],
  },
];

const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ open, onClose, onStartTour }) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('guide');

  const sectionLinks = useMemo(
    () => GUIDE_SECTIONS.map((s) => ({ id: s.id, title: s.title })),
    []
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 140,
        background: 'rgba(2,6,23,0.66)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(1120px, 94vw)',
          height: 'min(780px, 90vh)',
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          background: 'linear-gradient(180deg, rgba(2,6,23,0.96), rgba(15,23,42,0.96))',
          border: '1px solid rgba(148,163,184,0.26)',
          borderRadius: 14,
          boxShadow: '0 16px 44px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <aside
          style={{
            borderRight: '1px solid rgba(148,163,184,0.18)',
            padding: '14px 12px',
            background: 'rgba(2,6,23,0.45)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <LifeBuoy size={16} style={{ color: '#22d3ee' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', fontFamily: "'Orbitron', monospace", color: '#e2e8f0' }}>
                METAMECH SOLUTIONS
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Product Guide & Help</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <button
              onClick={() => setActiveTab('guide')}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.22)',
                background: activeTab === 'guide' ? 'rgba(34,211,238,0.16)' : 'rgba(15,23,42,0.35)',
                color: activeTab === 'guide' ? '#67e8f9' : '#cbd5e1',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Product Guide
            </button>
            <button
              onClick={() => setActiveTab('support')}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.22)',
                background: activeTab === 'support' ? 'rgba(34,211,238,0.16)' : 'rgba(15,23,42,0.35)',
                color: activeTab === 'support' ? '#67e8f9' : '#cbd5e1',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Help / Support
            </button>
          </div>

          {activeTab === 'guide' && (
            <div style={{ borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase' }}>
                Guide sections
              </div>
              {sectionLinks.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    display: 'block',
                    padding: '6px 8px',
                    borderRadius: 6,
                    color: '#cbd5e1',
                    fontSize: 11,
                    textDecoration: 'none',
                  }}
                >
                  {s.title}
                </a>
              ))}
            </div>
          )}
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            style={{
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              borderBottom: '1px solid rgba(148,163,184,0.18)',
              background: 'rgba(15,23,42,0.4)',
            }}
          >
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>
              {activeTab === 'guide' ? 'MetaMech User Guide / Manual' : 'MetaMech Help & Onboarding'}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(2,6,23,0.35)',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close help"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>
            {activeTab === 'guide' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {GUIDE_SECTIONS.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    style={{
                      border: '1px solid rgba(148,163,184,0.2)',
                      borderRadius: 10,
                      background: 'rgba(15,23,42,0.3)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: '#22d3ee' }}>{section.icon}</span>
                      <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{section.title}</h3>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', display: 'grid', gap: 5, fontSize: 12, lineHeight: 1.45 }}>
                      {section.bullets.map((b, idx) => (
                        <li key={`${section.id}-${idx}`}>{b}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 10,
                    background: 'rgba(15,23,42,0.3)',
                    padding: '12px',
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', color: '#e2e8f0', fontSize: 13 }}>Guided onboarding</h3>
                  <p style={{ margin: '0 0 10px', color: '#cbd5e1', fontSize: 12 }}>
                    Start a clean, skippable first-launch tour that explains ribbon controls, library usage, viewport navigation, properties editing, and product flow basics.
                  </p>
                  <button
                    onClick={onStartTour}
                    style={{
                      border: '1px solid rgba(34,211,238,0.45)',
                      borderRadius: 8,
                      background: 'rgba(34,211,238,0.15)',
                      color: '#67e8f9',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '8px 12px',
                    }}
                  >
                    Start Guided Tour
                  </button>
                </div>
                <div
                  style={{
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 10,
                    background: 'rgba(15,23,42,0.3)',
                    padding: '12px',
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', color: '#e2e8f0', fontSize: 13 }}>Support checklist</h3>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', display: 'grid', gap: 5, fontSize: 12, lineHeight: 1.45 }}>
                    <li>Review Bottom Panel validation if products do not move.</li>
                    <li>Confirm infeed/outfeed directions and connected edges.</li>
                    <li>Check Source and Sink placement for complete product flow.</li>
                    <li>Use camera presets and path recording for client-ready demos.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HelpSupportModal;
