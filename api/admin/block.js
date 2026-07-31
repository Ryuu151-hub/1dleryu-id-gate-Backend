// api/admin/block.js
// Add a TikTok account to the blocklist.
//
//   POST /api/admin/block
//   Headers: x-admin-secret: <ADMIN_SECRET>
//   Body (JSON): { "userId": "712...", "username": "someHandle", "reason": "..." }
//
// userId is the numeric TikTok user_id and is the reliable key (handles
// can be changed by the user at any time). If you only have a @handle,
// look up the numeric ID first with a tool such as:
//   - https://commentpicker.com/tiktok-id.php
//   - https://findidfb.com/find-tiktok-id/
//   - https://fameswap.com/tool-tiktok-user-id
// then pass both userId and username here for best coverage.

const { requireAdmin } = require('../../lib/auth');
const { blockUser } = require('../../lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  const { userId, username, reason } = req.body || {};
  if (!userId && !username) {
    res.status(400).json({ error: 'Provide at least one of userId or username.' });
    return;
  }

  try {
    await blockUser({ userId, username, reason });
    res.status(200).json({ ok: true, userId: userId || null, username: username || null });
  } catch (err) {
    console.error('[admin/block] error:', err);
    res.status(500).json({ error: 'Failed to update blocklist.' });
  }
};
