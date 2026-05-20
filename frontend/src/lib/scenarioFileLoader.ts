/**
 * Scenario File Loader
 *
 * Source:
 *   GitHub repository folder: /scenarios (JSON files)
 *
 * Scenario JSON supported shapes:
 * 1) { meta, project: { processNodes, edges, environmentAssets?, actors? }, rules? }
 * 2) { processNodes, edges, environmentAssets?, actors?, rules?, meta? }
 */

const GITHUB_OWNER = (import.meta.env.VITE_SCENARIO_GITHUB_OWNER || 'saviosyl').trim();
const GITHUB_REPO = (import.meta.env.VITE_SCENARIO_GITHUB_REPO || 'MetaMech-Simulation-Studio').trim();
const GITHUB_BRANCH = (import.meta.env.VITE_SCENARIO_GITHUB_BRANCH || 'main').trim();
const GITHUB_SCENARIO_PATH = (import.meta.env.VITE_SCENARIO_GITHUB_PATH || 'scenarios').replace(/^\/+|\/+$/g, '');
const GITHUB_CONTENTS_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_SCENARIO_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

export interface ScenarioMeta {
  name: string;
  category: string;
  description: string;
  version: string;
  thumbnail?: string;
}

export interface ScenarioProject {
  processNodes: any[];
  edges: any[];
  environmentAssets?: any[];
  actors?: any[];
}

export interface ScenarioFile {
  meta: ScenarioMeta;
  project: ScenarioProject;
  rules?: any[];
}

export interface ScenarioEntry {
  filename: string;
  downloadUrl: string;
  meta: ScenarioMeta;
}

interface GitHubContentsEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

function isJsonFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.json');
}

function scenarioNameFromFilename(filename: string): string {
  return filename.replace(/\.json$/i, '');
}

function toMetaFromFilename(filename: string): ScenarioMeta {
  return {
    name: scenarioNameFromFilename(filename),
    category: 'Custom',
    description: '',
    version: '1.0',
  };
}

function githubRawUrl(path: string): string {
  const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/${encodeURIComponent(GITHUB_BRANCH)}/${encodedPath}`;
}

function normalizeScenarioPayload(data: any, filename: string): ScenarioFile | null {
  const directProject = {
    processNodes: Array.isArray(data?.processNodes) ? data.processNodes : null,
    edges: Array.isArray(data?.edges) ? data.edges : null,
    environmentAssets: Array.isArray(data?.environmentAssets) ? data.environmentAssets : undefined,
    actors: Array.isArray(data?.actors) ? data.actors : undefined,
  };

  const nestedProject = {
    processNodes: Array.isArray(data?.project?.processNodes) ? data.project.processNodes : null,
    edges: Array.isArray(data?.project?.edges) ? data.project.edges : null,
    environmentAssets: Array.isArray(data?.project?.environmentAssets) ? data.project.environmentAssets : undefined,
    actors: Array.isArray(data?.project?.actors) ? data.project.actors : undefined,
  };

  const sourceProject = nestedProject.processNodes && nestedProject.edges
    ? nestedProject
    : (directProject.processNodes && directProject.edges ? directProject : null);

  if (!sourceProject) return null;

  const fallbackMeta = toMetaFromFilename(filename);
  const inputMeta = data?.meta && typeof data.meta === 'object' ? data.meta : null;

  return {
    meta: {
      name: fallbackMeta.name, // always derive visible name from filename
      category: typeof inputMeta?.category === 'string' && inputMeta.category.trim() ? inputMeta.category.trim() : fallbackMeta.category,
      description: typeof inputMeta?.description === 'string' ? inputMeta.description : fallbackMeta.description,
      version: typeof inputMeta?.version === 'string' && inputMeta.version.trim() ? inputMeta.version.trim() : fallbackMeta.version,
      thumbnail: typeof inputMeta?.thumbnail === 'string' ? inputMeta.thumbnail : undefined,
    },
    project: {
      processNodes: sourceProject.processNodes || [],
      edges: sourceProject.edges || [],
      environmentAssets: sourceProject.environmentAssets || [],
      actors: sourceProject.actors || [],
    },
    rules: Array.isArray(data?.rules) ? data.rules : [],
  };
}

async function fetchGitHubScenarioEntries(): Promise<ScenarioEntry[]> {
  try {
    const res = await fetch(GITHUB_CONTENTS_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return [];
    const items = await res.json() as GitHubContentsEntry[];
    if (!Array.isArray(items)) return [];

    return items
      .filter((entry) => entry.type === 'file' && isJsonFile(entry.name))
      .map((entry) => ({
        filename: entry.name,
        downloadUrl: entry.download_url || githubRawUrl(entry.path),
        meta: toMetaFromFilename(entry.name),
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename));
  } catch {
    return [];
  }
}

/** Fetch and parse a scenario JSON file. */
export async function loadScenarioFile(filename: string, downloadUrl?: string): Promise<ScenarioFile | null> {
  const url = downloadUrl || githubRawUrl(`${GITHUB_SCENARIO_PATH}/${filename}`);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeScenarioPayload(data, filename);
  } catch {
    return null;
  }
}

/** List scenario entries available to the app. */
export async function listScenarios(): Promise<ScenarioEntry[]> {
  return fetchGitHubScenarioEntries();
}
