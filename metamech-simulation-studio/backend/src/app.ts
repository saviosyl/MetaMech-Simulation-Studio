import express from 'express';
import cors from 'cors';

/**
 * Creates and configures the Express application.
 *
 * This function encapsulates middleware configuration and attaches
 * stubbed routes for authentication and project CRUD.  When implementing
 * functionality, replace the stubs with proper handlers.
 */
export function createApp() {
  const app = express();

  // Enable JSON body parsing
  app.use(express.json());
  // Enable CORS for development. In production, restrict allowed origins.
  app.use(cors({ origin: true, credentials: true }));

  /**
   * Authentication routes. These are placeholders and should be
   * replaced with real logic that interacts with PostgreSQL and sends
   * password reset emails.
   */
  app.post('/auth/register', (req, res) => {
    // TODO: implement registration
    res.status(501).json({ message: 'Registration not implemented yet.' });
  });

  app.post('/auth/login', (req, res) => {
    // TODO: implement login
    res.status(501).json({ message: 'Login not implemented yet.' });
  });

  app.post('/auth/logout', (_req, res) => {
    // TODO: implement logout
    res.status(200).json({ message: 'Logged out.' });
  });

  /**
   * Project CRUD routes. These endpoints return a 501 status to
   * indicate they are not implemented.  Once a database layer is added,
   * these handlers should create, read, update and delete projects.
   */
  app.get('/projects', (_req, res) => {
    // TODO: fetch projects from DB
    res.status(501).json({ projects: [] });
  });

  app.post('/projects', (req, res) => {
    // TODO: create a new project
    res.status(501).json({ message: 'Create project not implemented.' });
  });

  app.get('/projects/:id', (req, res) => {
    // TODO: read a single project
    res.status(501).json({ message: `Read project ${req.params.id} not implemented.` });
  });

  app.put('/projects/:id', (req, res) => {
    // TODO: update a project
    res.status(501).json({ message: `Update project ${req.params.id} not implemented.` });
  });

  app.delete('/projects/:id', (req, res) => {
    // TODO: delete a project
    res.status(501).json({ message: `Delete project ${req.params.id} not implemented.` });
  });

  return app;
}