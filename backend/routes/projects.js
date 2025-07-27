const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// ✅ Corrected Middleware Import
const { authenticate, authorize } = require('../middleware/auth');

// ✅ Controllers
const {
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
} = require('../controllers/projectController');

// ✅ Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* ✅ ROUTES */

// Public routes
router.get('/', getAllProjects);

// Engineer-only route MUST come before /:id
router.get('/engineer/assigned', authenticate, authorize(['engineer']), getEngineerProjects);

// MP-only routes
router.post('/', authenticate, authorize(['mp']), createProject);
router.put('/:id', authenticate, authorize(['mp']), updateProject);
router.delete('/:id', authenticate, authorize(['mp']), deleteProject);
router.put('/:id/award', authenticate, authorize(['mp']), awardEngineer);

// Engineer-only image upload
router.post('/:id/updates', authenticate, authorize(['engineer']), upload.single('image'), addProjectUpdate);

// Mwananchi-only feedback
router.post('/:id/feedback', authenticate, authorize(['mwananchi']), addFeedback);

// Dynamic ID-based routes (put these LAST!)
router.get('/:id/updates', getProjectUpdates);
router.get('/:id/feedback', getFeedback);
router.get('/:id/engineers', getProjectEngineers);

// ✅ Export
module.exports = router;
