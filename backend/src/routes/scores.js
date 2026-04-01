const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const { authenticate, requireSubscription } = require('../middleware/auth');

const router = express.Router();

// GET /api/scores — get current user's 5 scores (most recent first)
router.get('/', authenticate, requireSubscription, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('golf_scores')
      .select('*')
      .eq('user_id', req.user.id)
      .order('played_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    res.json({ scores: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// POST /api/scores — add a new score (triggers rolling window)
router.post(
  '/',
  authenticate,
  requireSubscription,
  [
    body('score').isInt({ min: 1, max: 45 }).withMessage('Score must be between 1 and 45'),
    body('played_on').isISO8601().withMessage('Invalid date format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { score, played_on } = req.body;

    try {
      // Insert — the DB trigger will auto-remove oldest beyond 5
      const { data, error } = await supabase
        .from('golf_scores')
        .insert({ user_id: req.user.id, score, played_on })
        .select()
        .single();

      if (error) throw error;

      // Fetch updated list
      const { data: scores } = await supabase
        .from('golf_scores')
        .select('*')
        .eq('user_id', req.user.id)
        .order('played_on', { ascending: false })
        .limit(5);

      res.status(201).json({ score: data, scores });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add score' });
    }
  }
);

// PUT /api/scores/:id — edit a score
router.put(
  '/:id',
  authenticate,
  requireSubscription,
  [
    body('score').optional().isInt({ min: 1, max: 45 }),
    body('played_on').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = {};
    if (req.body.score !== undefined) updates.score = req.body.score;
    if (req.body.played_on !== undefined) updates.played_on = req.body.played_on;
    updates.updated_at = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('golf_scores')
        .update(updates)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Score not found' });

      res.json({ score: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update score' });
    }
  }
);

// DELETE /api/scores/:id
router.delete('/:id', authenticate, requireSubscription, async (req, res) => {
  try {
    const { error } = await supabase
      .from('golf_scores')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Score deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

module.exports = router;
