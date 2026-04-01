const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../utils/supabase');

const router = express.Router();

// Raw body needed for Stripe signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, plan, charity_id, charity_percentage } = session.metadata;

        const planAmounts = { monthly: 9.99, yearly: 99.99 };
        const now = new Date();
        const renewalDate = plan === 'monthly'
          ? new Date(now.setMonth(now.getMonth() + 1))
          : new Date(now.setFullYear(now.getFullYear() + 1));

        await supabase.from('subscriptions').insert({
          user_id,
          plan,
          status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          stripe_payment_intent_id: session.payment_intent,
          amount_paid: planAmounts[plan],
          charity_id,
          charity_percentage: parseFloat(charity_percentage),
          starts_at: new Date().toISOString(),
          next_renewal_at: renewalDate.toISOString(),
        });

        console.log(`✅ Subscription created for user ${user_id}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_cycle') {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id, plan')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (sub) {
            const now = new Date();
            const renewalDate = sub.plan === 'monthly'
              ? new Date(now.setMonth(now.getMonth() + 1))
              : new Date(now.setFullYear(now.getFullYear() + 1));

            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                next_renewal_at: renewalDate.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', sub.id);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await supabase
          .from('subscriptions')
          .update({ status: 'lapsed', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', invoice.subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await supabase
          .from('subscriptions')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
