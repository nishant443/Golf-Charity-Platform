const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/dashboard — full dashboard data
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      { data: user },
      { data: subscription },
      { data: scores },
      { data: drawEntries },
      { data: verifications },
    ] = await Promise.all([
      supabase.from('users').select('id, email, full_name, handicap, avatar_url, created_at').eq('id', userId).single(),
      supabase.from('subscriptions').select('*, charity:charities(id, name, logo_url)').eq('user_id', userId).eq('status', 'active').single(),
      supabase.from('golf_scores').select('*').eq('user_id', userId).order('played_on', { ascending: false }).limit(5),
      supabase.from('draw_entries').select('*, draw:draws(month, year, status, drawn_numbers, published_at)').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('winner_verifications').select('*, draw:draws(month, year)').eq('user_id', userId),
    ]);

    const totalWon = drawEntries?.reduce((sum, e) => sum + parseFloat(e.prize_amount || 0), 0) || 0;
    const upcomingDraw = await supabase.from('draws').select('*').eq('status', 'pending').order('year').order('month').limit(1).single();

    res.json({
      user,
      subscription: subscription || null,
      scores: scores || [],
      drawEntries: drawEntries || [],
      verifications: verifications || [],
      totalWon: parseFloat(totalWon.toFixed(2)),
      upcomingDraw: upcomingDraw.data || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// PUT /api/users/profile — update profile
router.put(
  '/profile',
  authenticate,
  [
    body('full_name').optional().trim().isLength({ min: 2 }),
    body('handicap').optional().isFloat({ min: -10, max: 54 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { full_name, handicap, avatar_url } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (full_name) updates.full_name = full_name;
    if (handicap !== undefined) updates.handicap = handicap;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select('id, email, full_name, handicap, avatar_url')
        .single();

      if (error) throw error;
      res.json({ user: data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// PUT /api/users/password — change password
router.put(
  '/password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
      const valid = await bcrypt.compare(req.body.current_password, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

      const password_hash = await bcrypt.hash(req.body.new_password, 10);
      await supabase.from('users').update({ password_hash, updated_at: new Date().toISOString() }).eq('id', req.user.id);

      res.json({ message: 'Password updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update password' });
    }
  }
);

module.exports = router;
