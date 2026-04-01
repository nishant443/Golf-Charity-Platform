import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import useAuthStore from '../context/authStore';

export default function SubscribePage() {
  const [step, setStep] = useState(1); // 1=plan, 2=charity, 3=confirm
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [charities, setCharities] = useState([]);
  const [selectedCharityId, setSelectedCharityId] = useState('');
  const [charityPercentage, setCharityPercentage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [charitiesLoading, setCharitiesLoading] = useState(true);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshMe, hasSubscription } = useAuthStore();

  useEffect(() => {
    if (hasSubscription()) {
      navigate('/dashboard');
      return;
    }
    fetchCharities();
  }, []);

  useEffect(() => {
    if (params.get('subscription') === 'success') {
      toast.success('Subscription activated! Welcome to GolfCharity 🎉');
      refreshMe();
      navigate('/dashboard');
    }
    if (params.get('cancelled') === 'true') {
      toast.error('Checkout cancelled.');
    }
  }, [params]);

  const fetchCharities = async () => {
    try {
      const { data } = await api.get('/charities');
      setCharities(data.charities);
    } catch {
      toast.error('Failed to load charities');
    } finally {
      setCharitiesLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedCharityId) {
      toast.error('Please select a charity');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/subscriptions/create-checkout', {
        plan: selectedPlan,
        charity_id: selectedCharityId,
        charity_percentage: charityPercentage,
      });
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'monthly',
      label: 'Monthly',
      price: '£9.99',
      period: 'per month',
      description: 'Cancel anytime',
      popular: false,
    },
    {
      id: 'yearly',
      label: 'Yearly',
      price: '£99.99',
      period: 'per year',
      description: 'Save £19.89 vs monthly',
      popular: true,
    },
  ];

  const selectedCharity = charities.find(c => c.id === selectedCharityId);
  const subscriptionAmount = selectedPlan === 'monthly' ? 9.99 : 99.99;
  const charityAmount = ((subscriptionAmount * charityPercentage) / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="page-container pt-28 pb-16 max-w-3xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {['Choose Plan', 'Select Charity', 'Confirm'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${step > i + 1 ? 'text-forest-600' : step === i + 1 ? 'text-charcoal' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  step > i + 1 ? 'bg-forest-600 border-forest-600 text-white'
                  : step === i + 1 ? 'border-charcoal text-charcoal'
                  : 'border-gray-300 text-gray-400'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:block">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 w-8 mx-1 ${step > i + 1 ? 'bg-forest-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Plan */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="font-display text-3xl font-bold text-charcoal mb-2">Choose your plan</h2>
              <p className="text-gray-500 mb-8">All plans include monthly prize draws and charity contributions.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
                      selectedPlan === plan.id
                        ? 'border-forest-600 bg-forest-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-4 bg-gold text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                        Best Value
                      </span>
                    )}
                    <div className="font-display text-3xl font-bold text-charcoal mb-0.5">{plan.price}</div>
                    <div className="text-gray-500 text-sm mb-3">{plan.period}</div>
                    <div className="font-semibold text-charcoal mb-1">{plan.label}</div>
                    <div className="text-forest-600 text-sm">{plan.description}</div>
                    {selectedPlan === plan.id && (
                      <div className="absolute top-4 right-4 w-5 h-5 bg-forest-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full py-4 text-base">
                Continue →
              </button>
            </motion.div>
          )}

          {/* Step 2: Charity */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="font-display text-3xl font-bold text-charcoal mb-2">Choose your charity</h2>
              <p className="text-gray-500 mb-6">
                At least 10% of your subscription goes to this cause. You can give more.
              </p>

              {/* Charity % slider */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">Charity contribution</span>
                  <span className="font-display text-xl font-bold text-forest-700">
                    {charityPercentage}% <span className="text-sm text-gray-500 font-body font-normal">(£{charityAmount}/{selectedPlan === 'monthly' ? 'mo' : 'yr'})</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={charityPercentage}
                  onChange={e => setCharityPercentage(parseInt(e.target.value))}
                  className="w-full accent-forest-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10% (min)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Charity list */}
              {charitiesLoading ? (
                <LoadingSpinner className="py-8" />
              ) : (
                <div className="space-y-3 mb-8 max-h-72 overflow-y-auto pr-1">
                  {charities.map(charity => (
                    <button
                      key={charity.id}
                      onClick={() => setSelectedCharityId(charity.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        selectedCharityId === charity.id
                          ? 'border-forest-600 bg-forest-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-forest-700 font-bold text-sm">
                          {charity.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-charcoal flex items-center gap-2">
                          {charity.name}
                          {charity.is_featured && <span className="badge-gold text-xs">Featured</span>}
                        </div>
                        <div className="text-gray-500 text-xs truncate">{charity.description}</div>
                      </div>
                      {selectedCharityId === charity.id && (
                        <div className="w-5 h-5 bg-forest-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-4">← Back</button>
                <button
                  onClick={() => selectedCharityId && setStep(3)}
                  disabled={!selectedCharityId}
                  className="btn-primary flex-[2] py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="font-display text-3xl font-bold text-charcoal mb-2">Confirm & Subscribe</h2>
              <p className="text-gray-500 mb-8">Review your subscription before proceeding to payment.</p>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold capitalize">{selectedPlan} — {selectedPlan === 'monthly' ? '£9.99/mo' : '£99.99/yr'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Charity</span>
                  <span className="font-semibold">{selectedCharity?.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Charity contribution</span>
                  <span className="font-semibold text-forest-700">{charityPercentage}% (£{charityAmount})</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Prize pool contribution</span>
                  <span className="font-semibold text-gold">50% of subscription</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-6">
                You'll be redirected to our secure payment processor (Stripe). Your card details are never stored on our servers.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-4">← Back</button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="btn-primary flex-[2] py-4"
                >
                  {loading ? 'Redirecting...' : 'Proceed to Payment →'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
