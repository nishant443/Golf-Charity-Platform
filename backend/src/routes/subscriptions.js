const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const PLANS = {
  monthly: { amount: 999, interval: 'month', label: 'Monthly' },   // £9.99
  yearly: { amount: 9999, interval: 'year', label: 'Yearly' },     // £99.99
};

// GET /api/subscriptions/my — get current user's subscription
router.get('/my', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, charity:charities(id, name, logo_url)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    res.json({ subscription: data?.[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST /api/subscriptions/create-checkout — create Stripe checkout session
router.post(
  '/create-checkout',
  authenticate,
  [
    body('plan').isIn(['monthly', 'yearly']),
    body('charity_id').isUUID(),
    body('charity_percentage').isFloat({ min: 10, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { plan, charity_id, charity_percentage } = req.body;
    const planConfig = PLANS[plan];

    try {
      // Check for existing active subscription
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .single();

      if (existing) {
        return res.status(400).json({ error: 'You already have an active subscription' });
      }

      // Create or get Stripe customer
      let customerId;
      const { data: userRow } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', req.user.id)
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .single();

      if (userRow?.stripe_customer_id) {
        customerId = userRow.stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.full_name,
          metadata: { user_id: req.user.id },
        });
        customerId = customer.id;
      }

      // Create Stripe Price dynamically (or use pre-created price IDs)
      const price = await stripe.prices.create({
        currency: 'gbp',
        unit_amount: planConfig.amount,
        recurring: { interval: planConfig.interval },
        product_data: { name: `Golf Charity ${planConfig.label} Plan` },
      });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
        cancel_url: `${process.env.FRONTEND_URL}/subscribe?cancelled=true`,
        metadata: {
          user_id: req.user.id,
          plan,
          charity_id,
          charity_percentage: String(charity_percentage),
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// POST /api/subscriptions/cancel — cancel subscription
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel in Stripe
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    res.json({ message: 'Subscription cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// PUT /api/subscriptions/charity — update charity selection
router.put(
  '/charity',
  authenticate,
  [
    body('charity_id').isUUID(),
    body('charity_percentage').isFloat({ min: 10, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          charity_id: req.body.charity_id,
          charity_percentage: req.body.charity_percentage,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw error;
      res.json({ subscription: data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update charity' });
    }
  }
);

module.exports = router;
