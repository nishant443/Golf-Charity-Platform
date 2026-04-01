const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/charities — list all active charities (public)
router.get('/', async (req, res) => {
  try {
    const { search, featured } = req.query;

    let query = supabase
      .from('charities')
      .select('*, events:charity_events(id, title, event_date, location)')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ charities: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch charities' });
  }
});

// GET /api/charities/:id — single charity
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('*, events:charity_events(*)')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Charity not found' });
    res.json({ charity: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch charity' });
  }
});

module.exports = router;
