import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl mb-6">⛳</div>
        <h1 className="font-display text-6xl font-bold text-charcoal mb-4">404</h1>
        <p className="text-gray-500 text-lg mb-8">
          Looks like this shot went out of bounds. The page you're looking for doesn't exist.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="btn-primary">← Back to Home</Link>
          <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
      </motion.div>
    </div>
  );
}
