import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function AnimatedSection({ children, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Subscribe',
    description: 'Choose a monthly or yearly plan. A portion automatically goes to your chosen charity.',
    icon: '🎯',
  },
  {
    step: '02',
    title: 'Enter Your Scores',
    description: 'Log your last 5 Stableford golf scores. These become your draw entries.',
    icon: '⛳',
  },
  {
    step: '03',
    title: 'Monthly Draw',
    description: '5 numbers are drawn each month. Match 3, 4, or all 5 to win prizes.',
    icon: '🎲',
  },
  {
    step: '04',
    title: 'Win & Give',
    description: 'Claim prizes while your subscription funds charities. Everyone wins.',
    icon: '❤️',
  },
];

const PRIZE_TIERS = [
  { match: '5 Numbers', share: '40%', label: 'Jackpot', rollover: true, color: 'bg-gold' },
  { match: '4 Numbers', share: '35%', label: 'Second Prize', rollover: false, color: 'bg-forest-600' },
  { match: '3 Numbers', share: '25%', label: 'Third Prize', rollover: false, color: 'bg-forest-400' },
];

const STATS = [
  { value: '£50k+', label: 'Charity Raised' },
  { value: '2,400+', label: 'Active Players' },
  { value: '18', label: 'Charities Supported' },
  { value: '£12k', label: 'Jackpot This Month' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-charcoal">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-forest-900 opacity-30 clip-diagonal" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-forest-700 rounded-full blur-3xl opacity-20" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-gold rounded-full blur-3xl opacity-10" />

        <div className="page-container relative z-10 pt-24 pb-16">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-forest-900 text-forest-300 text-xs font-medium tracking-widest uppercase mb-6 border border-forest-700">
                Golf · Charity · Community
              </span>
              <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-6">
                Play golf.
                <br />
                <span className="text-forest-400">Win prizes.</span>
                <br />
                <em className="text-gold not-italic">Change lives.</em>
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-xl leading-relaxed mb-10 font-body font-light">
                Every score you enter becomes a lottery ticket. Every subscription feeds a charity.
                Monthly draws. Real prizes. Real impact.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/signup" className="btn-primary text-base px-8 py-4">
                  Start for £9.99/month →
                </Link>
                <a href="#how-it-works" className="btn-ghost text-white hover:bg-white/10 text-base px-8 py-4 border border-white/20 rounded-full">
                  See How It Works
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="bg-forest-700 py-8">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="font-display text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-forest-200 text-sm mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-cream">
        <div className="page-container">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="text-forest-600 text-sm font-medium uppercase tracking-widest">The Journey</span>
              <h2 className="section-title mt-2">How it works</h2>
              <p className="text-gray-500 mt-4 max-w-lg mx-auto">
                Four simple steps from signup to winning — and giving back to causes you believe in.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <div className="font-mono text-xs text-forest-400 font-medium mb-2">{item.step}</div>
                  <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-forest-200" />
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Prize Structure */}
      <section className="py-24 bg-white">
        <div className="page-container">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="text-gold text-sm font-medium uppercase tracking-widest">Prize Pool</span>
              <h2 className="section-title mt-2">Win every month</h2>
              <p className="text-gray-500 mt-4 max-w-lg mx-auto">
                A portion of every subscription builds the prize pool. Match your scores to win.
                The jackpot rolls over if unclaimed.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {PRIZE_TIERS.map((tier, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                >
                  <div className={`${tier.color} px-6 py-4`}>
                    <div className="text-white font-display text-2xl font-bold">{tier.share}</div>
                    <div className="text-white/80 text-sm">of prize pool</div>
                  </div>
                  <div className="px-6 py-5">
                    <div className="font-semibold text-charcoal mb-1">{tier.label}</div>
                    <div className="text-gray-500 text-sm">Match {tier.match}</div>
                    {tier.rollover && (
                      <span className="inline-block mt-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        Jackpot rolls over
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Charity Impact */}
      <section className="py-24 bg-forest-950 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="page-container relative z-10">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center">
              <motion.div variants={fadeUp}>
                <span className="text-forest-400 text-sm font-medium uppercase tracking-widest">Impact First</span>
                <h2 className="font-display text-4xl md:text-5xl font-bold mt-2 leading-tight">
                  Your game funds{' '}
                  <em className="text-gold not-italic">real change</em>
                </h2>
                <p className="text-gray-300 mt-6 text-lg leading-relaxed">
                  Minimum 10% of every subscription goes directly to your chosen charity.
                  You choose who benefits. You can give more anytime.
                </p>
                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                  <Link to="/charities" className="btn-primary">
                    Browse Charities
                  </Link>
                  <Link to="/signup" className="btn-ghost text-white hover:bg-white/10 border border-white/20 rounded-full px-6 py-3 text-sm font-medium">
                    Start Giving
                  </Link>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-cream">
        <div className="page-container">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="text-forest-600 text-sm font-medium uppercase tracking-widest">Pricing</span>
              <h2 className="section-title mt-2">Simple, transparent plans</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {[
                { plan: 'Monthly', price: '£9.99', period: '/month', saving: null, popular: false },
                { plan: 'Yearly', price: '£99.99', period: '/year', saving: 'Save £19.89', popular: true },
              ].map((p, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className={`rounded-2xl p-8 relative ${p.popular ? 'bg-forest-700 text-white shadow-xl' : 'bg-white border border-gray-100 shadow-sm'}`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-white text-xs font-semibold px-4 py-1 rounded-full">
                      Best Value
                    </span>
                  )}
                  <div className={`text-sm font-medium mb-1 ${p.popular ? 'text-forest-200' : 'text-gray-500'}`}>{p.plan}</div>
                  <div className={`font-display text-4xl font-bold mb-1 ${p.popular ? 'text-white' : 'text-charcoal'}`}>{p.price}</div>
                  <div className={`text-sm mb-6 ${p.popular ? 'text-forest-200' : 'text-gray-400'}`}>{p.period}</div>
                  {p.saving && <div className="text-gold text-sm font-medium mb-4">{p.saving}</div>}
                  <ul className={`space-y-2 text-sm mb-8 ${p.popular ? 'text-forest-100' : 'text-gray-600'}`}>
                    {['Monthly prize draws', 'Score tracking', 'Charity contribution', 'Winner verification'].map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <span className={p.popular ? 'text-forest-300' : 'text-forest-600'}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={p.popular ? 'btn-gold w-full text-center block' : 'btn-primary w-full text-center block'}
                  >
                    Get Started
                  </Link>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white">
        <div className="page-container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title mb-4">Ready to play for good?</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Join thousands of golfers making their rounds count. Subscribe today.
            </p>
            <Link to="/signup" className="btn-primary text-base px-10 py-4">
              Join GolfCharity →
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
