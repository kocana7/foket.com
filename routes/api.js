const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function saveToFile(key, value) {
  try { fs.writeFileSync(path.join(DATA_DIR, key + '.json'), JSON.stringify({ value }), 'utf8'); } catch(e) {}
}
function readFromFile(key) {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, key + '.json'), 'utf8');
    const obj = JSON.parse(raw);
    return obj.value != null ? obj.value : null;
  } catch(e) { return null; }
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminVerified) return next();
  if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) return next();
  res.status(403).json({ success: false, error: 'Forbidden' });
}

// POST /api/admin/verify — admin panel password → server session
router.post('/admin/verify', (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.ADMIN_PANEL_PASSWORD || 'Admin@123';
  if (password && password === expected) {
    req.session.adminVerified = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid admin password' });
});

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, username, telegram_username } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'email and password required' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) return res.status(409).json({ success: false, error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const uname = username ? username.trim() : email.split('@')[0];
    const tg = telegram_username ? telegram_username.trim() : null;
    const [result] = await db.query('INSERT INTO users (email, password, username, telegram_username, role, is_active) VALUES (?, ?, ?, ?, ?, 1)', [email.toLowerCase(), hash, uname, tg, 'user']);
    const userId = result.insertId;
    req.session.user = { id: userId, email: email.toLowerCase(), username: uname, role: 'user' };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'email and password required' });
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const loginIp = req.ip || '';
    await db.query('UPDATE users SET last_login = NOW(), last_login_ip = ? WHERE id = ?', [loginIp, user.id]);
    req.session.user = { id: user.id, email: user.email, username: user.username, role: user.role, plan_id: user.plan_id, plan_expires_at: user.plan_expires_at };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET /auth/google
router.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.redirect('/signup.html?error=google_not_configured');
  const redirect = encodeURIComponent(`${process.env.BASE_URL || 'https://www.foket.com'}/api/auth/google/callback`);
  const scope = encodeURIComponent('openid email profile');
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}`);
});

// GET /auth/google/callback
router.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/signup.html?error=google_cancelled');
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.BASE_URL || 'https://www.foket.com'}/api/auth/google/callback`;

    // 토큰 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Token exchange failed');

    // 사용자 정보 조회
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const googleUser = await userRes.json();
    if (!googleUser.email) throw new Error('No email from Google');

    const email = googleUser.email.toLowerCase();
    const username = googleUser.name || email.split('@')[0];

    // 기존 회원이면 로그인, 없으면 자동 가입
    let [rows] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    let user;
    if (rows.length) {
      user = rows[0];
      await db.query('UPDATE users SET last_login=NOW(), google_id=? WHERE id=?', [googleUser.id, user.id]);
    } else {
      const [result] = await db.query(
        'INSERT INTO users (email, username, password, role, is_active, google_id) VALUES (?, ?, ?, ?, 1, ?)',
        [email, username, '', 'user', googleUser.id]
      );
      user = { id: result.insertId, email, username, role: 'user' };
    }

    req.session.user = { id: user.id, email: user.email, username: user.username, role: user.role };
    req.session.save((err) => {
      if (err) console.error('[Google OAuth] session save error:', err);
      res.redirect('/mypage.html');
    });
  } catch (err) {
    console.error('[Google OAuth]', err.message);
    res.redirect('/signup.html?error=google_failed');
  }
});

// GET /api/auth/me
router.get('/auth/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.session && req.session.user) return res.json({ success: true, user: req.session.user });
  res.json({ success: false, user: null });
});

// PUT /api/auth/profile
router.put('/auth/profile', requireAuth, async (req, res) => {
  try {
    const { username, telegram_username } = req.body || {};
    const uid = req.session.user.id;
    await db.query('UPDATE users SET username = ?, telegram_username = ? WHERE id = ?', [username || req.session.user.username, telegram_username || null, uid]);
    req.session.user.username = username || req.session.user.username;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/password
router.put('/auth/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) return res.status(400).json({ success: false, error: 'Both passwords required' });
    if (new_password.length < 6) return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.session.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, username, role, is_active, email_verified, last_login, last_login_ip, created_at, plan_id, plan_expires_at, telegram_username FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users
router.post('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, username, role, telegram_username, is_active } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'email and password required' });
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) return res.status(409).json({ success: false, error: 'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (email, password, username, role, telegram_username, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [email.toLowerCase(), hash, username || email.split('@')[0], role || 'user', telegram_username || null, is_active != null ? is_active : 1]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { email, password, username, role, telegram_username, is_active } = req.body || {};
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET email=?, username=?, role=?, telegram_username=?, is_active=?, password=? WHERE id=?',
        [email, username, role || 'user', telegram_username || null, is_active != null ? is_active : 1, hash, id]);
    } else {
      await db.query('UPDATE users SET email=?, username=?, role=?, telegram_username=?, is_active=? WHERE id=?',
        [email, username, role || 'user', telegram_username || null, is_active != null ? is_active : 1, id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id/plan
router.put('/admin/users/:id/plan', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pid = req.body && req.body.plan_id ? parseInt(req.body.plan_id, 10) : null;
    if (pid) {
      await db.query('UPDATE users SET plan_id = ?, plan_expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?', [pid, id]);
    } else {
      await db.query('UPDATE users SET plan_id = NULL, plan_expires_at = NULL WHERE id = ?', [id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/admin/blocked-ips
router.get('/admin/blocked-ips', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT ip, blocked_at, reason FROM blocked_ips ORDER BY blocked_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/admin/block-ip  body: { ip, reason }
router.post('/admin/block-ip', requireAdmin, async (req, res) => {
  try {
    const ip = (req.body && req.body.ip) ? String(req.body.ip).trim() : null;
    if (!ip) return res.status(400).json({ success: false, error: 'ip required' });
    const reason = (req.body && req.body.reason) ? String(req.body.reason).trim() : null;
    await db.query('INSERT INTO blocked_ips (ip, reason) VALUES (?, ?) ON DUPLICATE KEY UPDATE blocked_at = NOW(), reason = VALUES(reason)', [ip, reason]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/admin/block-ip/:ip
router.delete('/admin/block-ip/:ip', requireAdmin, async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    await db.query('DELETE FROM blocked_ips WHERE ip = ?', [ip]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query('DELETE FROM users WHERE id = ? AND role != ?', [id, 'superadmin']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----- MySQL AppStorage API (관리자·메인 페이지용) -----

// GET /api/storage/:key
router.get('/storage/:key', async (req, res) => {
  const key = req.params.key.replace(/[^a-z0-9_-]/gi, '') || 'markets';
  try {
    const [rows] = await db.query('SELECT value FROM app_storage WHERE `key` = ? LIMIT 1', [key]);
    const value = rows.length ? rows[0].value : null;
    res.json({ success: true, value });
  } catch (err) {
    const value = readFromFile(key);
    res.json({ success: true, value });
  }
});

// POST /api/storage  body: { key, value }
router.post('/storage', express.json(), async (req, res) => {
  try {
    const key = (req.body && req.body.key) ? String(req.body.key).replace(/[^a-z0-9_-]/gi, '') : null;
    if (!key) return res.status(400).json({ success: false, error: 'key required' });
    const value = req.body.value != null ? (typeof req.body.value === 'string' ? req.body.value : JSON.stringify(req.body.value)) : '';
    saveToFile(key, value);
    try {
      await db.query(
        'INSERT INTO app_storage (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
        [key, value]
      );
    } catch(dbErr) { /* DB 실패해도 파일 저장은 완료 */ }
    res.json({ success: true, saved: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/public/markets  (메인 페이지용)
router.get('/public/markets', async (req, res) => {
  let raw = null;
  try {
    const [rows] = await db.query('SELECT value FROM app_storage WHERE `key` = ? LIMIT 1', ['markets_published']);
    raw = rows.length ? rows[0].value : null;
    if (!raw) {
      const [rows2] = await db.query('SELECT value FROM app_storage WHERE `key` = ? LIMIT 1', ['markets']);
      raw = rows2.length ? rows2[0].value : null;
    }
  } catch (err) {
    raw = readFromFile('markets_published') || readFromFile('markets');
  }
  if (raw == null) return res.json({ success: true, data: null });
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    res.json({ success: true, data });
  } catch(e) {
    res.json({ success: true, data: null });
  }
});

// GET /api/public/settings  (메인 페이지용 설정)
router.get('/public/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT value FROM app_storage WHERE `key` = ? LIMIT 1', ['settings']);
    if (!rows.length) return res.json({ success: true, data: {} });
    const data = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----- 기존 MySQL 기반 API -----
router.get('/signals', async (req, res) => {
  try {
    const tier = req.query.tier || 'free';
    const [signals] = await db.query(
      'SELECT coin, pair, signal_type, entry_price, take_profit_1, stop_loss, risk_percentage, risk_reward_ratio, status, result, created_at FROM signals WHERE tier = ? ORDER BY created_at DESC LIMIT 10',
      [tier]
    );
    res.json({ success: true, data: signals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT stat_key, stat_value FROM stats');
    const stats = {};
    rows.forEach(r => { stats[r.stat_key] = r.stat_value; });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/prices', async (req, res) => {
  const mockPrices = [
    { coin: 'BTC', price: 65432.10, change24h: 2.34 },
    { coin: 'ETH', price: 3241.50, change24h: 1.87 },
    { coin: 'BNB', price: 385.20, change24h: -0.54 },
    { coin: 'ADA', price: 0.4521, change24h: 3.12 },
    { coin: 'DOT', price: 8.32, change24h: 1.45 },
    { coin: 'LINK', price: 14.87, change24h: 2.91 },
    { coin: 'XRP', price: 0.6234, change24h: -1.23 },
    { coin: 'LTC', price: 82.41, change24h: 0.87 }
  ];
  res.json({ success: true, data: mockPrices });
});

// ----- Telegram Bot API -----

async function getTelegramToken() {
  let token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) {
    const [rows] = await db.query('SELECT value FROM app_storage WHERE `key` = ? LIMIT 1', ['telegram_bot_token']);
    token = rows.length ? rows[0].value : '';
  }
  return token;
}

// GET /api/telegram/status
router.get('/telegram/status', async (req, res) => {
  try {
    const token = await getTelegramToken();
    if (!token) return res.json({ configured: false });
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const j = await r.json();
    if (j.ok) res.json({ configured: true, bot_name: j.result.username });
    else res.json({ configured: false, error: j.description });
  } catch (e) {
    res.json({ configured: false, error: e.message });
  }
});

// GET /api/telegram/chats - 웹훅 삭제 후 getUpdates로 채팅 목록 조회
router.get('/telegram/chats', async (req, res) => {
  try {
    const token = await getTelegramToken();
    if (!token) return res.json({ success: false, error: '봇 토큰 미설정' });
    // 웹훅 삭제 (getUpdates와 충돌 방지)
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
    const j = await r.json();
    if (!j.ok) return res.json({ success: false, error: j.description });
    const seen = new Map();
    for (const u of j.result) {
      const chat = u.message?.chat || u.my_chat_member?.chat;
      if (chat && !seen.has(chat.id)) {
        seen.set(chat.id, { id: chat.id, title: chat.title || chat.username || chat.first_name, type: chat.type, username: chat.username || '' });
      }
    }
    res.json({ success: true, chats: [...seen.values()] });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// POST /api/telegram/send  body: { groups: [...], message: string }
router.post('/telegram/send', express.json(), async (req, res) => {
  try {
    const token = await getTelegramToken();
    if (!token) return res.status(400).json({ success: false, error: '봇 토큰이 설정되지 않았습니다. 관리자 패널에서 봇 토큰을 입력해주세요.' });

    const { groups, message } = req.body;
    if (!Array.isArray(groups) || !groups.length) return res.status(400).json({ success: false, error: 'groups required' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, error: 'message required' });
    if (message.length > 4096) return res.status(400).json({ success: false, error: '메시지가 너무 깁니다 (최대 4096자)' });

    const results = [];
    for (const chatId of groups) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        });
        const j = await r.json();
        results.push({ group: chatId, ok: j.ok, error: j.description });
      } catch (e) {
        results.push({ group: chatId, ok: false, error: e.message });
      }
    }
    const sent = results.filter(r => r.ok).length;
    res.json({ success: true, sent, total: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
