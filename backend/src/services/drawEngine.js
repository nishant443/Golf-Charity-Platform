/**
 * Draw Engine Service
 * 
 * Handles draw generation (random or algorithmic),
 * matching user scores against drawn numbers,
 * and prize pool calculation.
 */

const supabase = require('../utils/supabase');

const PRIZE_SHARES = {
  five_match: 0.40,   // 40% of pool
  four_match: 0.35,   // 35% of pool
  three_match: 0.25,  // 25% of pool
};

const SUBSCRIPTION_POOL_PERCENTAGE = 0.50; // 50% of each subscription goes to prize pool

/**
 * Generate 5 unique random numbers in range 1–45
 */
function generateRandomDraw() {
  const numbers = [];
  while (numbers.length < 5) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }
  return numbers.sort((a, b) => a - b);
}

/**
 * Algorithmic draw: weighted by frequency of user scores
 * Numbers that appear frequently get higher weighting
 * Numbers that appear rarely get lower weighting
 */
async function generateAlgorithmicDraw() {
  // Get all scores from active subscribers in last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: scores } = await supabase
    .from('golf_scores')
    .select('score')
    .gte('played_on', threeMonthsAgo.toISOString().split('T')[0]);

  if (!scores || scores.length < 10) {
    return generateRandomDraw(); // Fall back to random if not enough data
  }

  // Count frequency of each score value
  const freq = {};
  for (let i = 1; i <= 45; i++) freq[i] = 0;
  scores.forEach(({ score }) => { freq[score] = (freq[score] || 0) + 1; });

  // Build weighted array — higher frequency = higher chance to be drawn
  const weighted = [];
  for (let n = 1; n <= 45; n++) {
    const weight = Math.max(1, freq[n]);
    for (let w = 0; w < weight; w++) weighted.push(n);
  }

  // Pick 5 unique from weighted
  const drawn = [];
  const shuffled = weighted.sort(() => Math.random() - 0.5);
  for (const n of shuffled) {
    if (!drawn.includes(n)) drawn.push(n);
    if (drawn.length === 5) break;
  }

  // Top up with randoms if needed
  while (drawn.length < 5) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!drawn.includes(n)) drawn.push(n);
  }

  return drawn.sort((a, b) => a - b);
}

/**
 * Calculate total prize pool for a given draw month
 */
async function calculatePrizePool(month, year) {
  // Count active subscribers at draw time
  const { count } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { data: config } = await supabase
    .from('prize_pool_config')
    .select('monthly_price, yearly_price')
    .limit(1)
    .single();

  if (!count || !config) return { total: 0, jackpot: 0, four: 0, three: 0 };

  // Simplified: assume all monthly for pool calculation
  // In production, you'd aggregate actual subscription amounts
  const avgSubscriptionAmount = config.monthly_price;
  const total = count * avgSubscriptionAmount * SUBSCRIPTION_POOL_PERCENTAGE;

  return {
    total: parseFloat(total.toFixed(2)),
    jackpot: parseFloat((total * PRIZE_SHARES.five_match).toFixed(2)),
    four: parseFloat((total * PRIZE_SHARES.four_match).toFixed(2)),
    three: parseFloat((total * PRIZE_SHARES.three_match).toFixed(2)),
  };
}

/**
 * Match a user's 5 scores against the 5 drawn numbers
 */
function matchScores(userScores, drawnNumbers) {
  const matched = userScores.filter(s => drawnNumbers.includes(s));
  return {
    matched,
    count: matched.length,
    type: matched.length >= 5 ? 'five_match'
      : matched.length === 4 ? 'four_match'
      : matched.length === 3 ? 'three_match'
      : null,
  };
}

/**
 * Run the full draw for a given month/year
 */
async function runDraw(drawId, simulate = false) {
  const { data: draw } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single();

  if (!draw) throw new Error('Draw not found');

  // Generate drawn numbers
  const drawnNumbers = draw.logic === 'algorithmic'
    ? await generateAlgorithmicDraw()
    : generateRandomDraw();

  // Calculate pool (carry over jackpot from previous if exists)
  const pools = await calculatePrizePool(draw.month, draw.year);

  // Check previous jackpot rollover
  const { data: prevDraw } = await supabase
    .from('draws')
    .select('jackpot_pool, five_match_won')
    .eq('status', 'published')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .single();

  const rolloverJackpot = prevDraw && !prevDraw.five_match_won ? prevDraw.jackpot_pool : 0;
  const totalJackpot = pools.jackpot + parseFloat(rolloverJackpot || 0);

  // Get all active subscribers with their scores
  const { data: subscribers } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('status', 'active');

  const entries = [];
  for (const sub of subscribers) {
    const { data: scores } = await supabase
      .from('golf_scores')
      .select('score')
      .eq('user_id', sub.user_id)
      .order('played_on', { ascending: false })
      .limit(5);

    if (!scores || scores.length < 3) continue; // Need at least 3 scores to participate

    const scoreValues = scores.map(s => s.score);
    const match = matchScores(scoreValues, drawnNumbers);

    entries.push({
      draw_id: drawId,
      user_id: sub.user_id,
      subscription_id: sub.id,
      scores: scoreValues,
      matched_numbers: match.matched,
      match_count: match.count,
      match_type: match.type,
      prize_amount: 0, // calculated below
    });
  }

  // Count winners per tier to split prize
  const fiveWinners = entries.filter(e => e.match_type === 'five_match');
  const fourWinners = entries.filter(e => e.match_type === 'four_match');
  const threeWinners = entries.filter(e => e.match_type === 'three_match');

  const fiveMatchWon = fiveWinners.length > 0;

  // Assign prize amounts
  entries.forEach(entry => {
    if (entry.match_type === 'five_match') {
      entry.prize_amount = fiveWinners.length > 0
        ? parseFloat((totalJackpot / fiveWinners.length).toFixed(2))
        : 0;
    } else if (entry.match_type === 'four_match') {
      entry.prize_amount = fourWinners.length > 0
        ? parseFloat((pools.four / fourWinners.length).toFixed(2))
        : 0;
    } else if (entry.match_type === 'three_match') {
      entry.prize_amount = threeWinners.length > 0
        ? parseFloat((pools.three / threeWinners.length).toFixed(2))
        : 0;
    }
  });

  if (!simulate) {
    // Persist entries
    if (entries.length > 0) {
      await supabase.from('draw_entries').upsert(entries, {
        onConflict: 'draw_id,user_id',
      });
    }

    // Update draw
    await supabase
      .from('draws')
      .update({
        drawn_numbers: drawnNumbers,
        total_pool: pools.total,
        jackpot_pool: totalJackpot,
        four_match_pool: pools.four,
        three_match_pool: pools.three,
        five_match_won: fiveMatchWon,
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', drawId);

    // Create winner verifications for winners
    const winners = entries.filter(e => e.match_type !== null && e.prize_amount > 0);
    for (const winner of winners) {
      const { data: entry } = await supabase
        .from('draw_entries')
        .select('id')
        .eq('draw_id', drawId)
        .eq('user_id', winner.user_id)
        .single();

      if (entry) {
        await supabase.from('winner_verifications').insert({
          draw_entry_id: entry.id,
          user_id: winner.user_id,
          draw_id: drawId,
          payment_status: 'pending',
        });
      }
    }
  } else {
    // Simulation — just update draw status to simulated
    await supabase
      .from('draws')
      .update({
        drawn_numbers: drawnNumbers,
        total_pool: pools.total,
        jackpot_pool: totalJackpot,
        four_match_pool: pools.four,
        three_match_pool: pools.three,
        five_match_won: fiveMatchWon,
        status: 'simulated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', drawId);
  }

  return {
    drawn_numbers: drawnNumbers,
    pools: { total: pools.total, jackpot: totalJackpot, four: pools.four, three: pools.three },
    winners: {
      five: fiveWinners.length,
      four: fourWinners.length,
      three: threeWinners.length,
    },
    entries_count: entries.length,
    simulated: simulate,
  };
}

module.exports = { runDraw, generateRandomDraw, generateAlgorithmicDraw, matchScores, calculatePrizePool };
