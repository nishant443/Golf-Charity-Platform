import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import ScoreManager from '../components/dashboard/ScoreManager';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import useAuthStore from '../context/authStore';

function StatCard({ icon, label, value, sub, color = 'forest' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex items-start gap-4"
    >
      <div className={`w-12 h-12 rounded-xl bg-${color}-100 flex items-center justify-center text-2xl flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">{label}</div>
        <div className="font-display text-2xl font-bold text-charcoal">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [params] = useSearchParams();
  const { user, refreshMe } = useAuthStore();

  useEffect(() => {
    if (params.get('subscription') === 'success') {
      refreshMe();
      toast.success('Subscription activated! 🎉');
    }
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data: res } = await api.get('/users/dashboard');
      setData(res);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="pt-24 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );

  const { subscription, scores, drawEntries, verifications, totalWon, upcomingDraw } = data || {};
  const hasActiveSub = subscription?.status === 'active';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'scores', label: 'Scores' },
    { id: 'draws', label: 'Draw History' },
    { id: 'winnings', label: 'Winnings' },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="page-container pt-24 pb-16">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-charcoal">
              Welcome back, {user?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 mt-1">
              {hasActiveSub
                ? `${subscription.plan} subscriber · Renews ${format(new Date(subscription.next_renewal_at), 'dd MMM yyyy')}`
                : 'No active subscription'}
            </p>
          </div>
          {!hasActiveSub && (
            <Link to="/subscribe" className="btn-primary">
              Subscribe Now
            </Link>
          )}
        </div>

        {/* No subscription banner */}
        {!hasActiveSub && (
          <div className="mb-6 p-5 bg-gold/10 border border-gold/30 rounded-2xl flex items-center gap-4">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-semibold text-charcoal">Subscribe to enter draws</div>
              <div className="text-gray-600 text-sm">
                Join from £9.99/month — enter monthly prize draws and support your chosen charity.
              </div>
            </div>
            <Link to="/subscribe" className="btn-gold ml-auto whitespace-nowrap">
              Subscribe →
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="⛳"
            label="Scores Logged"
            value={scores?.length || 0}
            sub="out of 5 slots"
            color="forest"
          />
          <StatCard
            icon="🎲"
            label="Draws Entered"
            value={drawEntries?.length || 0}
            sub="total draws"
            color="blue"
          />
          <StatCard
            icon="🏆"
            label="Total Won"
            value={`£${totalWon?.toFixed(2) || '0.00'}`}
            sub="prize winnings"
            color="yellow"
          />
          <StatCard
            icon="❤️"
            label="Charity Given"
            value={subscription
              ? `£${((subscription.amount_paid * subscription.charity_percentage) / 100).toFixed(2)}`
              : '£0.00'}
            sub={subscription?.charity?.name || 'No charity selected'}
            color="red"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 w-fit mb-6 shadow-sm border border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-forest-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming draw */}
              {upcomingDraw && (
                <div className="card bg-forest-950 text-white">
                  <div className="text-forest-400 text-xs font-medium uppercase tracking-widest mb-2">Next Draw</div>
                  <div className="font-display text-2xl font-bold mb-1">
                    {format(new Date(upcomingDraw.year, upcomingDraw.month - 1), 'MMMM yyyy')}
                  </div>
                  <div className="text-forest-300 text-sm">
                    Your {scores?.length || 0} score{scores?.length !== 1 ? 's' : ''} will be entered automatically
                  </div>
                  {scores?.length === 0 && (
                    <div className="mt-3 text-yellow-400 text-sm">
                      ⚠️ Add at least 3 scores to qualify for draws
                    </div>
                  )}
                </div>
              )}

              {/* Recent draw entries */}
              <div className="card">
                <h3 className="font-display text-lg font-semibold mb-4">Recent Draws</h3>
                {drawEntries?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No draw history yet</p>
                ) : (
                  <div className="space-y-3">
                    {drawEntries.slice(0, 5).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium">
                            {entry.draw?.month && format(new Date(entry.draw.year, entry.draw.month - 1), 'MMMM yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Scores: {entry.scores?.join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          {entry.match_type ? (
                            <div>
                              <span className="badge-gold">
                                {entry.match_count} match
                              </span>
                              <div className="text-sm font-bold text-green-700 mt-1">£{entry.prize_amount}</div>
                            </div>
                          ) : (
                            <span className="badge-gray">No match</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="space-y-6">
              {/* Subscription */}
              {subscription && (
                <div className="card">
                  <h3 className="font-display text-lg font-semibold mb-4">Subscription</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plan</span>
                      <span className="font-medium capitalize">{subscription.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="badge-green">{subscription.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Renewal</span>
                      <span className="font-medium">
                        {format(new Date(subscription.next_renewal_at), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Charity</span>
                      <span className="font-medium">{subscription.charity?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Charity %</span>
                      <span className="font-medium text-forest-700">{subscription.charity_percentage}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick scores summary */}
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-lg font-semibold">My Scores</h3>
                  <button onClick={() => setActiveTab('scores')} className="text-xs text-forest-600 hover:underline">
                    Manage →
                  </button>
                </div>
                {scores?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No scores yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {scores.map(s => (
                      <div key={s.id} className="flex items-center gap-1.5 bg-forest-50 rounded-lg px-3 py-1.5">
                        <span className="font-mono font-bold text-forest-700">{s.score}</span>
                        <span className="text-gray-400 text-xs">{format(new Date(s.played_on), 'dd/MM')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scores' && (
          <div className="max-w-lg">
            {hasActiveSub ? (
              <ScoreManager scores={scores || []} onUpdate={(s) => setData(d => ({ ...d, scores: s }))} />
            ) : (
              <div className="card text-center py-10">
                <p className="text-gray-500 mb-4">Subscribe to track your scores</p>
                <Link to="/subscribe" className="btn-primary">Subscribe Now</Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'draws' && (
          <div className="space-y-3">
            {drawEntries?.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-3">🎲</div>
                <p className="text-gray-500">No draw history yet. Draws happen monthly.</p>
              </div>
            ) : (
              drawEntries.map(entry => (
                <div key={entry.id} className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">
                        {entry.draw?.month && format(new Date(entry.draw.year, entry.draw.month - 1), 'MMMM yyyy')} Draw
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Your scores: <span className="font-mono font-medium">{entry.scores?.join(', ')}</span>
                      </div>
                      {entry.draw?.drawn_numbers?.length > 0 && (
                        <div className="text-sm text-gray-500">
                          Drawn numbers: <span className="font-mono font-medium">{entry.draw.drawn_numbers.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {entry.match_type ? (
                        <div>
                          <span className="badge-gold">{entry.match_count} match</span>
                          <div className="font-display text-xl font-bold text-green-700 mt-1">+£{entry.prize_amount}</div>
                        </div>
                      ) : (
                        <span className="badge-gray">No match this draw</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'winnings' && (
          <div className="space-y-4">
            <div className="card bg-forest-950 text-white">
              <div className="text-forest-400 text-sm mb-1">Total Winnings</div>
              <div className="font-display text-4xl font-bold">£{totalWon?.toFixed(2)}</div>
            </div>

            {verifications?.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-gray-500">No winnings yet. Keep playing!</p>
              </div>
            ) : (
              verifications.map(v => (
                <div key={v.id} className="card flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {v.draw?.month && format(new Date(v.draw.year, v.draw.month - 1), 'MMMM yyyy')} Win
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      Verification: {v.payment_status}
                    </div>
                    {!v.proof_url && v.payment_status === 'pending' && (
                      <div className="text-xs text-orange-600 mt-1">
                        ⚠️ Upload proof to receive payment
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={
                      v.payment_status === 'paid' ? 'badge-green'
                      : v.payment_status === 'rejected' ? 'badge-red'
                      : 'badge-gold'
                    }>
                      {v.payment_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
