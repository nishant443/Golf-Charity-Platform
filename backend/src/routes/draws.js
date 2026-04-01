const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/draws — list published draws
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('draws')
      .select('*')
      .eq('status', 'published')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(12);

    res.json({ draws: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

// GET /api/draws/my-entries — user's draw participation history
router.get('/my-entries', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('draw_entries')
      .select(`
        *,
        draw:draws(id, month, year, drawn_numbers, status, published_at),
        verification:winner_verifications(payment_status, proof_url)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    res.json({ entries: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// GET /api/draws/:id — get specific draw details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('draws')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!data) return res.status(404).json({ error: 'Draw not found' });
    res.json({ draw: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draw' });
  }
});

// POST /api/draws/:id/upload-proof — winner uploads verification screenshot
router.post('/:drawId/upload-proof', authenticate, async (req, res) => {
  const { proof_url } = req.body;
  if (!proof_url) return res.status(400).json({ error: 'proof_url is required' });

  try {
    const { data, error } = await supabase
      .from('winner_verifications')
      .update({ proof_url, updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('draw_id', req.params.drawId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No verification record found' });

    res.json({ verification: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload proof' });
  }
});

module.exports = router;
