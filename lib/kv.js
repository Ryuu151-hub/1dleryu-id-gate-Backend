// lib/kv.js
// Thin wrapper around Vercel KV (Upstash Redis) holding the TikTok
// user-id blocklist. Two indexes are kept in sync:
//   - blocked:userIds   (Set)  -> numeric TikTok user_id, the stable key
//   - blocked:usernames (Set)  -> lowercased @handle, a soft fallback for
//                                 when only the handle could be resolved
//   - blocked:meta      (Hash) -> userId -> JSON { username, reason, blockedAt }
//
// Requires a Vercel KV store linked to the project (Storage tab ->
// Create Database -> KV). Vercel injects KV_REST_API_URL /
// KV_REST_API_TOKEN automatically once linked — no manual env setup.

const { kv } = require('@vercel/kv');

const USERID_SET = 'blocked:userIds';
const USERNAME_SET = 'blocked:usernames';
const META_HASH = 'blocked:meta';

function normUsername(u) {
  return String(u || '').trim().replace(/^@/, '').toLowerCase();
}

async function isBlocked({ userId, username }) {
  const checks = [];
  if (userId) checks.push(kv.sismember(USERID_SET, String(userId)));
  const uname = normUsername(username);
  if (uname) checks.push(kv.sismember(USERNAME_SET, uname));

  if (checks.length === 0) return { blocked: false };

  const results = await Promise.all(checks);
  const blocked = results.some((r) => r === 1 || r === true);
  if (!blocked) return { blocked: false };

  let meta = null;
  if (userId) {
    try {
      const raw = await kv.hget(META_HASH, String(userId));
      if (raw) meta = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {}
  }
  return { blocked: true, reason: meta?.reason };
}

async function blockUser({ userId, username, reason }) {
  const uname = normUsername(username);
  const ops = [];
  if (userId) ops.push(kv.sadd(USERID_SET, String(userId)));
  if (uname) ops.push(kv.sadd(USERNAME_SET, uname));
  if (userId) {
    ops.push(
      kv.hset(META_HASH, {
        [String(userId)]: JSON.stringify({
          username: uname || null,
          reason: reason || 'Blocked by admin',
          blockedAt: new Date().toISOString(),
        }),
      })
    );
  }
  await Promise.all(ops);
}

async function unblockUser({ userId, username }) {
  const uname = normUsername(username);
  const ops = [];
  if (userId) ops.push(kv.srem(USERID_SET, String(userId)));
  if (uname) ops.push(kv.srem(USERNAME_SET, uname));
  if (userId) ops.push(kv.hdel(META_HASH, String(userId)));
  await Promise.all(ops);
}

async function listBlocked() {
  const ids = await kv.smembers(USERID_SET);
  const out = [];
  for (const id of ids || []) {
    let meta = null;
    try {
      const raw = await kv.hget(META_HASH, String(id));
      if (raw) meta = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {}
    out.push({ userId: id, ...(meta || {}) });
  }
  return out;
}

module.exports = { isBlocked, blockUser, unblockUser, listBlocked };
