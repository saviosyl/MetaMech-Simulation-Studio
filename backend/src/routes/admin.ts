import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

type OemSyncUploadRequest = {
  companyId: string;
  modelId: string;
  contentBase64: string;
};

type OemSyncRequestBody = {
  index?: {
    companies?: Array<{
      id?: string;
      name?: string;
      folder?: string;
      models?: Array<{
        id?: string;
        name?: string;
        glbPath?: string;
      }>;
    }>;
  };
  uploads?: OemSyncUploadRequest[];
  deletions?: string[];
};

type GithubOemConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  libraryPath: string;
};

function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function isAdminUser(req: Request): boolean {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'superadmin' || role === 'owner') return true;
  const allowList = String(process.env.OEM_ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
  const email = normalizeEmail(req.user?.email || '');
  return !!email && allowList.includes(email);
}

function sanitizeRelativeRepoPath(rawPath: string): string | null {
  const normalized = rawPath.replace(/\\/g, '/').trim().replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('..')) return null;
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  for (const segment of segments) {
    if (!/^[a-zA-Z0-9._\- ]+$/.test(segment)) return null;
  }
  return segments.join('/');
}

function encodeRepoPath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function githubOemConfig(): GithubOemConfig | null {
  const token = String(process.env.GITHUB_TOKEN || '').trim();
  if (!token) return null;
  const owner = String(process.env.GITHUB_OEM_OWNER || 'saviosyl').trim();
  const repo = String(process.env.GITHUB_OEM_REPO || 'MetaMech-Simulation-Studio').trim();
  const branch = String(process.env.GITHUB_OEM_BRANCH || 'main').trim();
  const libraryPath = sanitizeRelativeRepoPath(String(process.env.GITHUB_OEM_LIBRARY_PATH || 'oem-library'));
  if (!owner || !repo || !branch || !libraryPath) return null;
  return { token, owner, repo, branch, libraryPath };
}

async function githubContentsRequest(
  config: GithubOemConfig,
  method: 'GET' | 'PUT' | 'DELETE',
  repoPath: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: any }> {
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodeRepoPath(repoPath)}${method === 'GET' ? `?ref=${encodeURIComponent(config.branch)}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'User-Agent': 'metamech-oem-sync',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { status: res.status, data: parsed };
}

async function githubGetFileSha(config: GithubOemConfig, repoPath: string): Promise<string | null> {
  const response = await githubContentsRequest(config, 'GET', repoPath);
  if (response.status === 404) return null;
  if (response.status < 200 || response.status >= 300) {
    const message = response.data?.message || `GitHub get failed (${response.status})`;
    throw new Error(message);
  }
  const sha = String(response.data?.sha || '');
  return sha || null;
}

async function githubUpsertFile(config: GithubOemConfig, repoPath: string, contentBase64: string, message: string): Promise<void> {
  const sha = await githubGetFileSha(config, repoPath);
  const payload: Record<string, unknown> = {
    message,
    content: contentBase64,
    branch: config.branch,
  };
  if (sha) payload.sha = sha;
  const response = await githubContentsRequest(config, 'PUT', repoPath, payload);
  if (response.status < 200 || response.status >= 300) {
    const errorMessage = response.data?.message || `GitHub update failed (${response.status})`;
    throw new Error(errorMessage);
  }
}

async function githubDeleteFile(config: GithubOemConfig, repoPath: string, message: string): Promise<boolean> {
  const sha = await githubGetFileSha(config, repoPath);
  if (!sha) return false;
  const response = await githubContentsRequest(config, 'DELETE', repoPath, {
    message,
    sha,
    branch: config.branch,
  });
  if (response.status < 200 || response.status >= 300) {
    const errorMessage = response.data?.message || `GitHub delete failed (${response.status})`;
    throw new Error(errorMessage);
  }
  return true;
}

router.post('/oem-library/sync', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!isAdminUser(req)) return res.status(403).json({ error: 'Admin access required' });

    const config = githubOemConfig();
    if (!config) return res.status(500).json({ error: 'GitHub sync not configured on server' });

    const body = req.body as OemSyncRequestBody;
    const index = body?.index;
    const companies = index?.companies;
    if (!Array.isArray(companies)) return res.status(400).json({ error: 'Invalid OEM index payload' });

    const uploads = Array.isArray(body?.uploads) ? body!.uploads! : [];
    const deletions = Array.isArray(body?.deletions) ? body!.deletions! : [];
    if (uploads.length > 40) return res.status(400).json({ error: 'Too many uploads in one sync (max 40)' });
    if (deletions.length > 200) return res.status(400).json({ error: 'Too many deletions in one sync (max 200)' });

    const uploadedPaths = new Set<string>();
    const deletedPaths = new Set<string>();

    for (const upload of uploads) {
      const company = companies.find((entry) => String(entry?.id || '') === String(upload.companyId || ''));
      const model = company?.models?.find((entry) => String(entry?.id || '') === String(upload.modelId || ''));
      if (!company || !model) continue;

      const folderRaw = String(company.folder || company.id || company.name || '').trim();
      const folder = sanitizeRelativeRepoPath(folderRaw);
      const modelFile = sanitizeRelativeRepoPath(String(model.glbPath || ''));
      if (!modelFile) {
        return res.status(400).json({ error: `Model "${model.name || model.id || upload.modelId}" is missing glbPath for GitHub sync` });
      }

      const relativePath = folder ? `${folder}/${modelFile}` : modelFile;
      const safeRelativePath = sanitizeRelativeRepoPath(relativePath);
      if (!safeRelativePath) {
        return res.status(400).json({ error: `Invalid model file path for "${model.name || model.id || upload.modelId}"` });
      }

      const rawBase64 = String(upload.contentBase64 || '').trim();
      const base64Payload = rawBase64.includes(',') ? rawBase64.split(',').pop() || '' : rawBase64;
      if (!base64Payload) return res.status(400).json({ error: 'Invalid upload file payload' });
      const fileBytes = Buffer.from(base64Payload, 'base64');
      if (fileBytes.length > 15 * 1024 * 1024) {
        return res.status(400).json({ error: `File "${modelFile}" is too large (limit 15MB)` });
      }

      const repoPath = `${config.libraryPath}/${safeRelativePath}`;
      await githubUpsertFile(config, repoPath, base64Payload, `OEM Admin: upload ${safeRelativePath} by ${req.user.email}`);
      uploadedPaths.add(safeRelativePath);
    }

    for (const deletion of deletions) {
      const safeRelativePath = sanitizeRelativeRepoPath(String(deletion || ''));
      if (!safeRelativePath) continue;
      if (uploadedPaths.has(safeRelativePath)) continue;
      const repoPath = `${config.libraryPath}/${safeRelativePath}`;
      const deleted = await githubDeleteFile(config, repoPath, `OEM Admin: delete ${safeRelativePath} by ${req.user.email}`);
      if (deleted) deletedPaths.add(safeRelativePath);
    }

    const indexJson = JSON.stringify(index, null, 2);
    const indexBase64 = Buffer.from(indexJson, 'utf8').toString('base64');
    await githubUpsertFile(
      config,
      `${config.libraryPath}/index.json`,
      indexBase64,
      `OEM Admin: update OEM index by ${req.user.email}`,
    );

    return res.json({
      ok: true,
      uploadedCount: uploadedPaths.size,
      deletedCount: deletedPaths.size,
      indexUpdated: true,
      branch: config.branch,
      repo: `${config.owner}/${config.repo}`,
    });
  } catch (error: any) {
    console.error('OEM GitHub sync failed:', error);
    return res.status(500).json({ error: error?.message || 'GitHub sync failed' });
  }
});

export default router;

