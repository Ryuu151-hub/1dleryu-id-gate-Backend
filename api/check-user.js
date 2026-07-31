// api/check-user.js
// Public, read-only endpoint the extension calls to find out whether the
// currently-signed-in TikTok account is allowed to use the extension.
//
//   GET /api/check-user?userId=712...&username=someHandle
//
// Response shape is deliberately identical to the existing /api/access
// endpoint style already used by this extension:
//   { allowed: boolean, blocked: boolean, message?: string }
//
// Fail-open by design: if the KV store isn't configured yet or errors
// out, we return allowed:true so a mis-deployed backend never locks
// everyone out of the extension.

const { isBlocked } = require('../lib/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ allowed: true, blocked: false, message: 'Method not allowed' });
    return;
  }

  const { userId, username } = req.query || {};

  if (!userId && !username) {
    // Nothing to check against — treat as "not logged in yet", allow.
    res.status(200).json({ allowed: true, blocked: false });
    return;
  }

  try {
    const result = await isBlocked({ userId, username });
    if (result.blocked) {
      res.status(200).json({
        allowed: false,
        blocked: true,
        message: result.reason || 'This TikTok account has been restricted from using this extension.',
      });
      return;
    }
    res.status(200).json({ allowed: true, blocked: false });
  } catch (err) {
    console.error('[check-user] KV error, failing open:', err);
    res.status(200).json({ allowed: true, blocked: false });
  }
};
