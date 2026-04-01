import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function CharitiesPage() {
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCharities();
  }, [search]);

  const fetchCharities = async () => {
    try {
      const { data } = await api.get('/charities', { params: { search: search || undefined } });
      setCharities(data.charities);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const featured = charities.filter(c => c.is_featured);
  const rest = charities.filter(c => !c.is_featured);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="page-container pt-28 pb-16">
        {/* Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-forest-600 text-sm font-medium uppercase tracking-widest">Charities</span>
            <h1 className="section-title mt-2 mb-4">Choose who you support</h1>
            <p className="text-gray-500">
              Every subscription contributes at least 10% to your chosen charity.
              You can give more any time.
            </p>
          </motion.div>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-10">
          <input
            type="search"
            className="input pl-10"
            placeholder="Search charities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && !search && (
              <div className="mb-12">
                <h2 className="font-display text-2xl font-semibold mb-5 flex items-center gap-2">
                  ⭐ Spotlight Charities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {featured.map((charity, i) => (
                    <CharityCard key={charity.id} charity={charity} featured delay={i * 0.1} />
                  ))}
                </div>
              </div>
            )}

            {/* All */}
            <div>
              {!search && <h2 className="font-display text-2xl font-semibold mb-5">All Charities</h2>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(search ? charities : rest).map((charity, i) => (
                  <CharityCard key={charity.id} charity={charity} delay={i * 0.06} />
                ))}
              </div>
              {charities.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🔍</div>
                  <p>No charities found for "{search}"</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

function CharityCard({ charity, featured = false, delay = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const upcomingEvents = charity.events?.filter(e => new Date(e.event_date) >= new Date()).slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`card-hover cursor-pointer ${featured ? 'ring-2 ring-forest-200' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4 mb-3">
        <div className={`w-12 h-12 rounded-xl ${featured ? 'bg-forest-100' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
          {charity.logo_url ? (
            <img src={charity.logo_url} alt={charity.name} className="w-8 h-8 object-contain" />
          ) : (
            <span className={`font-display font-bold text-lg ${featured ? 'text-forest-700' : 'text-gray-600'}`}>
              {charity.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-charcoal">{charity.name}</h3>
            {charity.is_featured && <span className="badge-green text-xs">Featured</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{charity.description}</p>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-gray-100 pt-4 mt-2"
        >
          {charity.website_url && (
            <a
              href={charity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest-600 text-sm hover:underline"
              onClick={e => e.stopPropagation()}
            >
              Visit website →
            </a>
          )}
          {upcomingEvents?.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Upcoming Events</div>
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-2 text-sm">
                    <span className="text-forest-600 mt-0.5">📅</span>
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-gray-400 text-xs">
                        {format(new Date(event.event_date), 'dd MMM yyyy')} · {event.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
