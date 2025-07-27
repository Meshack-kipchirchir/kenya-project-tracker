const db = require('../db');
const path = require('path');

/** ✅ Get all projects with MP and Engineer info (Mwananchi Dashboard) */
const getAllProjects = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.project_name,
        p.constituency,
        p.status,
        p.budget,
        p.start_date,
        p.end_date,
        mp.name AS mp_name,
        GROUP_CONCAT(DISTINCT e.name SEPARATOR ', ') AS engineers
      FROM projects p
      LEFT JOIN users mp ON p.created_by = mp.id AND mp.role = 'mp'
      LEFT JOIN project_engineers pe ON p.id = pe.project_id
      LEFT JOIN users e ON pe.engineer_id = e.id
      GROUP BY p.id
      ORDER BY p.start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to fetch enriched project list:", err);
    res.status(500).json({ error: 'Failed to fetch projects with details' });
  }
};

/** ✅ Get projects assigned to the logged-in engineer */
const getEngineerProjects = async (req, res) => {
  const engineerId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT p.* FROM projects p
       JOIN project_engineers pe ON pe.project_id = p.id
       WHERE pe.engineer_id = ?`,
      [engineerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assigned projects' });
  }
};

/** ✅ Create new project by MP */
const createProject = async (req, res) => {
  const { constituency, project_name, status, budget, start_date, end_date } = req.body;
  const created_by = req.user.id;

  try {
    const [result] = await db.query(
      'INSERT INTO projects (constituency, project_name, status, budget, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [constituency, project_name, status, budget, start_date, end_date, created_by]
    );
    res.status(201).json({ id: result.insertId, message: 'Project created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
};

/** ✅ Update existing project */
const updateProject = async (req, res) => {
  const { id } = req.params;
  const { constituency, project_name, status, budget, start_date, end_date } = req.body;

  try {
    await db.query(
      'UPDATE projects SET constituency=?, project_name=?, status=?, budget=?, start_date=?, end_date=? WHERE id=?',
      [constituency, project_name, status, budget, start_date, end_date, id]
    );
    res.json({ message: 'Project updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
};

/** ✅ Delete a project */
const deleteProject = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

/** ✅ Upload engineer's update with image */
const addProjectUpdate = async (req, res) => {
  const { id: projectId } = req.params;
  const image = req.file ? req.file.filename : null;
  const update_text = req.body.update_text;
  const engineer_id = req.user.id;

  if (!update_text || !engineer_id) {
    return res.status(400).json({ error: 'Missing update text or engineer ID' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO project_updates (project_id, engineer_id, update_text, image) VALUES (?, ?, ?, ?)',
      [projectId, engineer_id, update_text, image]
    );
    res.status(201).json({ message: 'Update posted successfully', id: result.insertId });
  } catch (err) {
    console.error('❌ Error uploading project update:', err);
    res.status(500).json({ error: 'Failed to upload update', detail: err.message });
  }
};

/** ✅ Get updates for a project */
const getProjectUpdates = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM project_updates WHERE project_id = ? ORDER BY date DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
};

/** ✅ Submit feedback from Mwananchi */
const addFeedback = async (req, res) => {
  const { id: projectId } = req.params;
  const { user_id, comment } = req.body;

  if (!comment || !user_id) {
    return res.status(400).json({ error: 'Missing comment or user ID' });
  }

  try {
    await db.query(
      'INSERT INTO project_feedback (user_id, project_id, comment) VALUES (?, ?, ?)',
      [user_id, projectId, comment]
    );
    res.status(201).json({ message: 'Feedback submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

/** ✅ Get feedback for a project */
const getFeedback = async (req, res) => {
  const { id: projectId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT pf.comment, pf.created_at, u.name FROM project_feedback pf JOIN users u ON pf.user_id = u.id WHERE pf.project_id = ? ORDER BY pf.created_at DESC',
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

/** ✅ Award engineers to a project */
const awardEngineer = async (req, res) => {
  const { id: projectId } = req.params;
  const { engineer_ids } = req.body;

  if (!Array.isArray(engineer_ids) || engineer_ids.length === 0) {
    return res.status(400).json({ error: 'Engineer IDs are required as an array' });
  }

  try {
    const messages = [];

    for (const engineer_id of engineer_ids) {
      const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [engineer_id]);

      if (rows.length === 0) {
        messages.push(`❌ Engineer ID ${engineer_id} not found`);
        continue;
      }

      const user = rows[0];
      const role = typeof user.role === 'object' ? user.role.toString() : user.role;

      if (role !== 'engineer') {
        await db.query('UPDATE users SET role = ? WHERE id = ?', ['engineer', engineer_id]);
      }

      const [existing] = await db.query(
        'SELECT * FROM project_engineers WHERE project_id = ? AND engineer_id = ?',
        [projectId, engineer_id]
      );

      if (existing.length > 0) {
        messages.push(`⚠️ Engineer ID ${engineer_id} is already awarded`);
        continue;
      }

      await db.query(
        'INSERT INTO project_engineers (project_id, engineer_id) VALUES (?, ?)',
        [projectId, engineer_id]
      );
      messages.push(`✅ Engineer ID ${engineer_id} successfully awarded`);
    }

    res.json({ message: 'Awarding completed', details: messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to award engineers', detail: err.message });
  }
};

/** ✅ Get engineers assigned to a specific project */
const getProjectEngineers = async (req, res) => {
  const { id: projectId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name FROM project_engineers pe
       JOIN users u ON pe.engineer_id = u.id
       WHERE pe.project_id = ?`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assigned engineers' });
  }
};

// ✅ Export all functions
module.exports = {
  getAllProjects,
  getEngineerProjects,
  createProject,
  updateProject,
  deleteProject,
  addProjectUpdate,
  getProjectUpdates,
  addFeedback,
  getFeedback,
  awardEngineer,
  getProjectEngineers
};
