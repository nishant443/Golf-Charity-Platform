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


        // Step 1: get subscription id
        let subscriptionId = session.subscription;
        let subscription = null;

        // Step 2: fetch subscription if exists
        if (subscriptionId) {
          try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
          } catch (err) {
            console.warn("⚠️ Failed to fetch subscription:", err.message);
          }
        }

        // Step 3: extract metadata safely
        let user_id, plan, charity_id, charity_percentage;

        if (subscription && subscription.metadata && subscription.metadata.user_id) {
          ({ user_id, plan, charity_id, charity_percentage } = subscription.metadata);
        } else {
          ({ user_id, plan, charity_id, charity_percentage } = session.metadata || {});
        }

        // ❗ VERY IMPORTANT: skip invalid test events
        if (!user_id) {
          console.log("⚠️ Skipping event: missing user_id (likely test trigger)");
          break;
        }

        const planAmounts = { monthly: 9.99, yearly: 99.99 };

        const now = new Date();
        const renewalDate =
          plan === 'monthly'
            ? new Date(new Date().setMonth(now.getMonth() + 1))
            : new Date(new Date().setFullYear(now.getFullYear() + 1));

        // Step 4: ensure subscription id exists
        let stripeSubscriptionId = subscriptionId;

        if (!stripeSubscriptionId && session.customer) {
          try {
            const invoices = await stripe.invoices.list({
              customer: session.customer,
              limit: 1,
            });

            if (invoices.data.length > 0) {
              stripeSubscriptionId = invoices.data[0].subscription;
            }
          } catch (err) {
            console.warn("⚠️ Could not fetch subscription from invoices:", err.message);
          }
        }

        // ❗ If still null → skip (avoid DB garbage)
        if (!stripeSubscriptionId) {
          console.log("⚠️ No subscription ID found, skipping insert");
          break;
        }

        await supabase.from('subscriptions').insert({
          user_id,
          plan,
          status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_payment_intent_id: session.payment_intent,
          amount_paid: planAmounts[plan],
          charity_id,
          charity_percentage: parseFloat(charity_percentage),
          starts_at: new Date().toISOString(),
          next_renewal_at: renewalDate.toISOString(),
        });

        console.log(`✅ Subscription created for user ${user_id}, sub_id: ${stripeSubscriptionId}`);
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
