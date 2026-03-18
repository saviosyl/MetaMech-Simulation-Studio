import { FrameTemplateId } from './model';

export interface FrameTemplateDefinition {
  id: FrameTemplateId;
  name: string;
  description: string;
}

export const FRAME_TEMPLATES: FrameTemplateDefinition[] = [
  {
    id: 'table-frame',
    name: 'Table Frame',
    description: 'Four-post frame with top and lower rails.',
  },
  {
    id: 'support-stand',
    name: 'Support Stand',
    description: 'Open stand with reinforced mid-height ring.',
  },
  {
    id: 'guarding-frame',
    name: 'Guarding Frame',
    description: 'Perimeter guarding frame with brace reinforcement.',
  },
  {
    id: 'enclosure-frame',
    name: 'Enclosure Frame',
    description: 'Full enclosure skeleton with roof/bay cross members.',
  },
];
