/**
 * Scenario File Loader — Loads JSON scenarios from Scenario/sample/
 * 
 * Scenarios are managed via GitHub: add/remove JSON files in the repo.
 * The manifest.json lists available scenarios.
 * Each scenario JSON must have { meta: { name, category, description, version }, project: { processNodes, edges, ... } }
 */

const SCENARIO_BASE = '/Scenario/sample';

export interface ScenarioMeta {
  name: string;
  category: string;
  description: string;
  version: string;
  thumbnail?: string;
}

export interface ScenarioFile {
  meta: ScenarioMeta;
  project: {
    processNodes: any[];
    edges: any[];
    environmentAssets?: any[];
    actors?: any[];
  };
}

interface ManifestEntry {
  file: string;
  fallbackName?: string;
}

/** Fetch the scenario manifest (list of available JSON files) */
async function fetchManifest(): Promise<ManifestEntry[]> {
  try {
    const res = await fetch(`${SCENARIO_BASE}/manifest.json`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** Fetch and parse a single scenario JSON file */
export async function loadScenarioFile(filename: string): Promise<ScenarioFile | null> {
  try {
    const res = await fetch(`${SCENARIO_BASE}/${filename}`);
    if (!res.ok) return null;
    const data = await res.json();

    // Ensure meta exists (backward compatibility)
    if (!data.meta) {
      data.meta = {
        name: data.project?.name || filename.replace(/_/g, ' ').replace('.json', ''),
        category: 'Demo',
        description: '',
        version: '1.0',
      };
    }

    return data as ScenarioFile;
  } catch {
    return null;
  }
}

/** Load all available scenario headers (meta only, without full project data) */
export async function listScenarios(): Promise<{ filename: string; meta: ScenarioMeta }[]> {
  const manifest = await fetchManifest();
  const results: { filename: string; meta: ScenarioMeta }[] = [];

  for (const entry of manifest) {
    const scenario = await loadScenarioFile(entry.file);
    if (scenario) {
      results.push({
        filename: entry.file,
        meta: scenario.meta,
      });
    } else if (entry.fallbackName) {
      results.push({
        filename: entry.file,
        meta: {
          name: entry.fallbackName,
          category: 'Demo',
          description: '',
          version: '1.0',
        },
      });
    }
  }

  return results;
}
