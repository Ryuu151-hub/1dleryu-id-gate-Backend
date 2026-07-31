// lib/auth.js
// Minimal shared-secret check for the /api/admin/* routes.
// Set ADMIN_SECRET in the Vercel project's Environment Variables
// (Settings -> Environment Variables) — never commit it to the repo.

function requireAdmin(req, res) {
  const provided = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    res.status(500).json({ error: 'ADMIN_SECRET is not configured on the server.' });
    return false;
  }
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

module.exports = { requireAdmin };
