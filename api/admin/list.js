// api/admin/list.js
//   GET /api/admin/list
//   Headers: x-admin-secret: <ADMIN_SECRET>

const { requireAdmin } = require('../../lib/auth');
const { listBlocked } = require('../../lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const items = await listBlocked();
    res.status(200).json({ count: items.length, items });
  } catch (err) {
    console.error('[admin/list] error:', err);
    res.status(500).json({ error: 'Failed to read blocklist.' });
  }
};
