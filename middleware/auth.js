function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.accepts('html')) return res.redirect('/login.html');
  return res.status(401).json({ error: 'Login required' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Login required' });
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
