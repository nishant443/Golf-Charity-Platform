const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireSubscription = async (req, res, next) => {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', req.user.id)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    return res.status(403).json({ error: 'Active subscription required', code: 'NO_SUBSCRIPTION' });
  }

  req.subscription = subscription;
  next();
};

module.exports = { authenticate, requireAdmin, requireSubscription };
