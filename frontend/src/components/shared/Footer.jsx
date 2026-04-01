import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white mt-20">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-forest-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-display font-bold">G</span>
              </div>
              <span className="font-display font-semibold text-white text-lg">
                Golf<span className="text-forest-400">Charity</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Play golf. Enter draws. Change lives. A subscription platform where your passion
              for golf funds causes you care about.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-gray-200 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/charities', label: 'Charities' },
                { to: '/signup', label: 'Join Now' },
                { to: '/login', label: 'Sign In' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-gray-200 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Draw Rules'].map((item) => (
                <li key={item}>
                  <span className="text-gray-400 text-sm cursor-pointer hover:text-white transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} GolfCharity. All rights reserved. Built for Digital Heroes.
          </p>
          <p className="text-gray-500 text-xs">
            Responsible gambling: 18+ only. Please play responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
