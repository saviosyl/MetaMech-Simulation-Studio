import { Router } from 'express';
import { z } from 'zod';
import { query } from '../database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255)
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  data: z.any().optional()
});

// Get all projects for the authenticated user
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, data, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user!.id]
    );

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  try {
    const { name } = createProjectSchema.parse(req.body);

    const result = await query(
      'INSERT INTO projects (user_id, name, data) VALUES ($1, $2, $3) RETURNING id, name, data, created_at, updated_at',
      [req.user!.id, name, {}]
    );

    const project = result.rows[0];
    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific project
router.get('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const result = await query(
      'SELECT id, name, data, created_at, updated_at FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const updates = updateProjectSchema.parse(req.body);

    // Check if project exists and belongs to user
    const existingProject = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user!.id]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(updates.name);
    }

    if (updates.data !== undefined) {
      updateFields.push(`data = $${paramCount++}`);
      updateValues.push(JSON.stringify(updates.data));
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(projectId, req.user!.id);

    const updateQuery = `
      UPDATE projects 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING id, name, data, created_at, updated_at
    `;

    const result = await query(updateQuery, updateValues);

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Update project error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const result = await query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [projectId, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate a project
router.post('/:id/duplicate', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Get original project
    const originalProject = await query(
      'SELECT name, data FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user!.id]
    );

    if (originalProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const original = originalProject.rows[0];
    const duplicateName = `${original.name} (Copy)`;

    // Create duplicate
    const result = await query(
      'INSERT INTO projects (user_id, name, data) VALUES ($1, $2, $3) RETURNING id, name, data, created_at, updated_at',
      [req.user!.id, duplicateName, original.data]
    );

    const project = result.rows[0];
    res.status(201).json({ project });
  } catch (error) {
    console.error('Duplicate project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;