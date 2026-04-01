const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { runDraw } = require('../services/drawEngine');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ── ANALYTICS ──────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscribers },
      { data: draws },
      { data: verifications },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('draws').select('total_pool, jackpot_pool').eq('status', 'published'),
      supabase.from('winner_verifications').select('*'),
    ]);

    const totalPrizePool = draws?.reduce((sum, d) => sum + parseFloat(d.total_pool || 0), 0) || 0;
    const totalJackpot = draws?.reduce((sum, d) => sum + parseFloat(d.jackpot_pool || 0), 0) || 0;
    const pendingVerifications = verifications?.filter(v => v.payment_status === 'pending').length || 0;
    const paidOut = verifications?.filter(v => v.payment_status === 'paid').length || 0;

    // Charity contributions (sum of charity_percentage * amount_paid)
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('amount_paid, charity_percentage');

    const totalCharityContributions = subs?.reduce((sum, s) =>
      sum + (parseFloat(s.amount_paid) * parseFloat(s.charity_percentage) / 100), 0) || 0;

    res.json({
      stats: {
        totalUsers,
        activeSubscribers,
        totalPrizePool: parseFloat(totalPrizePool.toFixed(2)),
        totalJackpot: parseFloat(totalJackpot.toFixed(2)),
        totalCharityContributions: parseFloat(totalCharityContributions.toFixed(2)),
        pendingVerifications,
        paidOut,
        totalDraws: draws?.length || 0,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── USER MANAGEMENT ────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, full_name, role, created_at, subscriptions(status, plan)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) query = query.ilike('email', `%${search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ users: data, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id — edit user
router.put('/users/:id', async (req, res) => {
  const { full_name, email, role, handicap } = req.body;
  try {
    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (handicap !== undefined) updates.handicap = handicap;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ user: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/admin/scores/:id — admin edit golf score
router.put('/scores/:id', async (req, res) => {
  const { score, played_on } = req.body;
  try {
    const updates = { updated_at: new Date().toISOString() };
    if (score !== undefined) updates.score = score;
    if (played_on) updates.played_on = played_on;

    const { data, error } = await supabase
      .from('golf_scores')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ score: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// GET /api/admin/users/:id/scores
router.get('/users/:id/scores', async (req, res) => {
  try {
    const { data } = await supabase
      .from('golf_scores')
      .select('*')
      .eq('user_id', req.params.id)
      .order('played_on', { ascending: false })
      .limit(5);
    res.json({ scores: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// ── DRAW MANAGEMENT ────────────────────────────────────────

// GET /api/admin/draws
router.get('/draws', async (req, res) => {
  try {
    const { data } = await supabase
      .from('draws')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    res.json({ draws: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

// POST /api/admin/draws — create new draw
router.post('/draws', [
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2024 }),
  body('logic').isIn(['random', 'algorithmic']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { month, year, logic } = req.body;

  try {
    const { data, error } = await supabase
      .from('draws')
      .insert({ month, year, logic })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ draw: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Draw for this month/year already exists' });
    res.status(500).json({ error: 'Failed to create draw' });
  }
});

// POST /api/admin/draws/:id/simulate — simulate without publishing
router.post('/draws/:id/simulate', async (req, res) => {
  try {
    const result = await runDraw(req.params.id, true);
    res.json({ simulation: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Simulation failed: ' + err.message });
  }
});

// POST /api/admin/draws/:id/publish — run and publish draw
router.post('/draws/:id/publish', async (req, res) => {
  try {
    const result = await runDraw(req.params.id, false);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Draw failed: ' + err.message });
  }
});

// PUT /api/admin/draws/:id — update draw config (logic type)
router.put('/draws/:id', async (req, res) => {
  const { logic } = req.body;
  try {
    const { data, error } = await supabase
      .from('draws')
      .update({ logic, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .neq('status', 'published') // Can't edit published draws
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(400).json({ error: 'Cannot edit a published draw' });
    res.json({ draw: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update draw' });
  }
});

// ── CHARITY MANAGEMENT ─────────────────────────────────────

// POST /api/admin/charities
router.post('/charities', [
  body('name').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, logo_url, website_url, is_featured } = req.body;

  try {
    const { data, error } = await supabase
      .from('charities')
      .insert({ name, description, logo_url, website_url, is_featured: !!is_featured })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ charity: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create charity' });
  }
});

// PUT /api/admin/charities/:id
router.put('/charities/:id', async (req, res) => {
  const { name, description, logo_url, website_url, is_featured, is_active } = req.body;
  try {
    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (website_url !== undefined) updates.website_url = website_url;
    if (is_featured !== undefined) updates.is_featured = is_featured;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('charities')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ charity: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update charity' });
  }
});

// DELETE /api/admin/charities/:id
router.delete('/charities/:id', async (req, res) => {
  try {
    await supabase.from('charities').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Charity deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate charity' });
  }
});

// ── WINNER VERIFICATION ────────────────────────────────────

// GET /api/admin/verifications
router.get('/verifications', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('winner_verifications')
      .select(`
        *,
        user:users(id, email, full_name),
        draw:draws(month, year, drawn_numbers),
        entry:draw_entries(match_type, match_count, prize_amount, scores)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('payment_status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ verifications: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

// PUT /api/admin/verifications/:id — approve/reject/mark paid
router.put('/verifications/:id', [
  body('payment_status').isIn(['pending', 'paid', 'rejected']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { payment_status, admin_notes } = req.body;

  try {
    const updates = {
      payment_status,
      admin_notes,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (payment_status === 'paid') updates.paid_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('winner_verifications')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ verification: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// ── SUBSCRIPTIONS ──────────────────────────────────────────

// GET /api/admin/subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, user:users(email, full_name), charity:charities(name)')
      .order('created_at', { ascending: false });

    res.json({ subscriptions: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

module.exports = router;
