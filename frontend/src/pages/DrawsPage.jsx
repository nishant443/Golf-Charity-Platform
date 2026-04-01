import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function DrawsPage() {
  const [draws, setDraws] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/draws'),
      api.get('/draws/my-entries'),
    ]).then(([drawRes, entryRes]) => {
      setDraws(drawRes.data.draws);
      setEntries(entryRes.data.entries);
    }).catch(() => toast.error('Failed to load draws'))
      .finally(() => setLoading(false));
  }, []);

  const getMyEntry = (drawId) => entries.find(e => e.draw_id === drawId);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="page-container pt-28 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="text-forest-600 text-sm font-medium uppercase tracking-widest">Monthly Draws</span>
          <h1 className="section-title mt-2">Draw Results</h1>
          <p className="text-gray-500 mt-2">Results for past monthly prize draws.</p>
        </motion.div>

        {loading ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : draws.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎲</div>
            <h3 className="font-display text-xl font-semibold mb-2">No draws yet</h3>
            <p className="text-gray-500">The first draw results will appear here when published by admin.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {draws.map((draw, i) => {
              const myEntry = getMyEntry(draw.id);
              return (
                <motion.div
                  key={draw.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                      <h2 className="font-display text-xl font-bold">
                        {format(new Date(draw.year, draw.month - 1), 'MMMM yyyy')} Draw
                      </h2>
                      <div className="text-sm text-gray-500 mt-0.5">
                        Published {format(new Date(draw.published_at), 'dd MMM yyyy')} ·{' '}
                        <span className="capitalize">{draw.logic}</span> draw
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 mb-1">Total Pool</div>
                      <div className="font-display text-2xl font-bold text-charcoal">
                        £{parseFloat(draw.total_pool).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Drawn numbers */}
                  <div className="mb-5">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                      Drawn Numbers
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {draw.drawn_numbers?.map((n, idx) => (
                        <div
                          key={idx}
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-lg border-2 ${
                            myEntry?.matched_numbers?.includes(n)
                              ? 'bg-gold border-gold text-white'
                              : 'bg-white border-gray-200 text-charcoal'
                          }`}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prize pools */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Jackpot (5 match)', amount: draw.jackpot_pool, color: 'bg-gold/10 text-yellow-800', won: draw.five_match_won },
                      { label: '4 Match', amount: draw.four_match_pool, color: 'bg-forest-50 text-forest-800', won: null },
                      { label: '3 Match', amount: draw.three_match_pool, color: 'bg-blue-50 text-blue-800', won: null },
                    ].map((tier, ti) => (
                      <div key={ti} className={`p-3 rounded-xl ${tier.color}`}>
                        <div className="text-xs font-medium mb-1">{tier.label}</div>
                        <div className="font-display font-bold text-lg">
                          £{parseFloat(tier.amount || 0).toFixed(2)}
                        </div>
                        {tier.won === false && tier.label.includes('Jackpot') && (
                          <div className="text-xs mt-1 opacity-70">Rolls over</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* My result */}
                  {myEntry && (
                    <div className={`p-4 rounded-xl border ${
                      myEntry.match_type
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        My Entry
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm">
                            Scores: <span className="font-mono font-medium">{myEntry.scores?.join(', ')}</span>
                          </div>
                          {myEntry.matched_numbers?.length > 0 && (
                            <div className="text-sm text-forest-700 mt-0.5">
                              Matched: <span className="font-mono font-bold">{myEntry.matched_numbers?.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        {myEntry.match_type ? (
                          <div className="text-right">
                            <div className="badge-gold">{myEntry.match_count} numbers matched!</div>
                            <div className="font-display text-xl font-bold text-green-700 mt-1">
                              +£{parseFloat(myEntry.prize_amount).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="badge-gray">No match this draw</span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
