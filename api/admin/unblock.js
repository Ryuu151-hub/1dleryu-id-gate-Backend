// api/admin/unblock.js
//   POST /api/admin/unblock
//   Headers: x-admin-secret: <ADMIN_SECRET>
//   Body (JSON): { "userId": "712...", "username": "someHandle" }

const { requireAdmin } = require('../../lib/auth');
const { unblockUser } = require('../../lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  const { userId, username } = req.body || {};
  if (!userId && !username) {
    res.status(400).json({ error: 'Provide at least one of userId or username.' });
    return;
  }

  try {
    await unblockUser({ userId, username });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/unblock] error:', err);
    res.status(500).json({ error: 'Failed to update blocklist.' });
  }
};
