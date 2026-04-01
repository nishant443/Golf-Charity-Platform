require('dotenv').config();
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ── Hash passwords
  const adminHash = await bcrypt.hash('Admin@123!', 10);
  const userHash = await bcrypt.hash('User@123!', 10);

  // ── Upsert Admin
  const { data: admin, error: adminErr } = await supabase
    .from('users')
    .upsert({
      email: 'admin@golfcharity.com',
      password_hash: adminHash,
      full_name: 'Platform Admin',
      role: 'admin',
    }, { onConflict: 'email' })
    .select()
    .single();

  if (adminErr) console.error('Admin error:', adminErr);
  else console.log('✅ Admin user:', admin.email);

  // ── Upsert Test User
  const { data: testUser, error: userErr } = await supabase
    .from('users')
    .upsert({
      email: 'user@test.com',
      password_hash: userHash,
      full_name: 'Test Golfer',
      role: 'subscriber',
      handicap: 12.5,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (userErr) console.error('User error:', userErr);
  else console.log('✅ Test user:', testUser.email);

  // ── Seed charities if they don't exist
  const { count } = await supabase
    .from('charities')
    .select('*', { count: 'exact', head: true });

  if (count === 0) {
    const { error: charErr } = await supabase.from('charities').insert([
      { name: 'Cancer Research UK', description: 'Pioneering research to beat cancer.', is_featured: true, is_active: true },
      { name: 'Age UK', description: 'Improving later life for everyone.', is_featured: false, is_active: true },
      { name: 'Mind', description: 'Mental health support and advice.', is_featured: false, is_active: true },
      { name: 'British Heart Foundation', description: 'Fighting heart and circulatory diseases.', is_featured: true, is_active: true },
      { name: 'RNLI', description: 'Saving lives at sea since 1824.', is_featured: false, is_active: true },
      { name: 'Macmillan Cancer Support', description: 'Supporting those living with cancer.', is_featured: false, is_active: true },
    ]);
    if (charErr) console.error('Charities error:', charErr);
    else console.log('✅ Charities seeded');
  } else {
    console.log('ℹ️  Charities already exist, skipping');
  }

  // ── Add test subscription for test user
  const { data: charity } = await supabase
    .from('charities')
    .select('id')
    .eq('name', 'Cancer Research UK')
    .single();

  if (charity && testUser) {
    const now = new Date();
    const renewal = new Date(now);
    renewal.setMonth(renewal.getMonth() + 1);

    const { error: subErr } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: testUser.id,
        plan: 'monthly',
        status: 'active',
        amount_paid: 9.99,
        charity_id: charity.id,
        charity_percentage: 10,
        starts_at: now.toISOString(),
        next_renewal_at: renewal.toISOString(),
      }, { onConflict: 'user_id' });

    if (subErr) console.error('Subscription error:', subErr.message);
    else console.log('✅ Test subscription created');

    // ── Add 5 test golf scores
    const scores = [
      { user_id: testUser.id, score: 32, played_on: '2026-03-28' },
      { user_id: testUser.id, score: 28, played_on: '2026-03-21' },
      { user_id: testUser.id, score: 35, played_on: '2026-03-14' },
      { user_id: testUser.id, score: 24, played_on: '2026-03-07' },
      { user_id: testUser.id, score: 31, played_on: '2026-02-28' },
    ];

    // Delete existing scores first
    await supabase.from('golf_scores').delete().eq('user_id', testUser.id);

    const { error: scoreErr } = await supabase.from('golf_scores').insert(scores);
    if (scoreErr) console.error('Scores error:', scoreErr.message);
    else console.log('✅ 5 golf scores added');
  }

  // ── Create a sample published draw
  const { data: existingDraw } = await supabase
    .from('draws')
    .select('id')
    .eq('month', 3)
    .eq('year', 2026)
    .single();

  if (!existingDraw) {
    const { data: draw, error: drawErr } = await supabase
      .from('draws')
      .insert({
        month: 3,
        year: 2026,
        status: 'published',
        logic: 'random',
        drawn_numbers: [24, 28, 31, 35, 42],
        total_pool: 149.85,
        jackpot_pool: 59.94,
        four_match_pool: 52.45,
        three_match_pool: 37.46,
        five_match_won: false,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (drawErr) console.error('Draw error:', drawErr.message);
    else {
      console.log('✅ Sample draw (March 2026) published');

      // Add draw entry for test user — they have scores [32, 28, 35, 24, 31]
      // drawn = [24, 28, 31, 35, 42] → matches: 24, 28, 31, 35 = 4 match!
      if (testUser && draw) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', testUser.id)
          .single();

        await supabase.from('draw_entries').insert({
          draw_id: draw.id,
          user_id: testUser.id,
          subscription_id: sub?.id,
          scores: [32, 28, 35, 24, 31],
          matched_numbers: [24, 28, 31, 35],
          match_count: 4,
          match_type: 'four_match',
          prize_amount: 52.45,
        });

        // Winner verification
        const { data: entry } = await supabase
          .from('draw_entries')
          .select('id')
          .eq('draw_id', draw.id)
          .eq('user_id', testUser.id)
          .single();

        if (entry) {
          await supabase.from('winner_verifications').insert({
            draw_entry_id: entry.id,
            user_id: testUser.id,
            draw_id: draw.id,
            payment_status: 'pending',
          });
          console.log('✅ Winner entry created for test user (4-match, £52.45)');
        }
      }
    }
  } else {
    console.log('ℹ️  Sample draw already exists, skipping');
  }

  // ── Create upcoming draw (pending)
  const { data: upcomingDraw } = await supabase
    .from('draws')
    .select('id')
    .eq('month', 4)
    .eq('year', 2026)
    .single();

  if (!upcomingDraw) {
    await supabase.from('draws').insert({
      month: 4,
      year: 2026,
      status: 'pending',
      logic: 'random',
    });
    console.log('✅ Upcoming draw (April 2026) created');
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('Test credentials:');
  console.log('  Admin  → admin@golfcharity.com / Admin@123!');
  console.log('  User   → user@test.com / User@123!');
  console.log('\nStripe test card: 4242 4242 4242 4242 (any future date, any CVC)\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
