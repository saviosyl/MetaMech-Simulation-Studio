export interface ProfileFamily {
  id: string;
  name: string;
  series: string;
  sectionMm: [number, number];
  massKgPerM: number;
  color: string;
}

export const PROFILE_LIBRARY: ProfileFamily[] = [
  {
    id: 'profile-20x20',
    name: '20x20 Light',
    series: 'ISO 20',
    sectionMm: [20, 20],
    massKgPerM: 0.55,
    color: '#b8bec6',
  },
  {
    id: 'profile-30x30',
    name: '30x30 Standard',
    series: 'ISO 30',
    sectionMm: [30, 30],
    massKgPerM: 0.95,
    color: '#bcc2c9',
  },
  {
    id: 'profile-40x40',
    name: '40x40 Heavy',
    series: 'ISO 40',
    sectionMm: [40, 40],
    massKgPerM: 1.55,
    color: '#c4c9cf',
  },
  {
    id: 'profile-45x45',
    name: '45x45 Machine Frame',
    series: 'ISO 45',
    sectionMm: [45, 45],
    massKgPerM: 2.1,
    color: '#c9ced4',
  },
];

export function getProfileFamily(profileFamilyId: string): ProfileFamily {
  return (
    PROFILE_LIBRARY.find((p) => p.id === profileFamilyId) ??
    PROFILE_LIBRARY[2]
  );
}
