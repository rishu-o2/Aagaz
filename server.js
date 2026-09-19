const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3010);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aagaz-admin-change-me';
const ROOT = __dirname;
const CLIENT_ROOT = path.join(ROOT, 'dist');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'club-data.json');
const sessions = new Map();

const initialData = {
  tournaments: [
    { id: 'lpu-premier-league', title: 'Aagaz LPU Premier League', sport: 'Cricket', format: 'T10 · Team entry', dates: '10–18 October 2026', deadline: '2026-10-02', venue: 'LPU Cricket Ground', entryFee: '₹1,500 per team', capacity: 16, registrations: [], description: 'An open campus cricket league for student-led teams.' },
    { id: 'aagaz-five-a-side', title: 'Aagaz 5s Cup', sport: 'Football', format: '5-a-side · Team entry', dates: '25–26 October 2026', deadline: '2026-10-15', venue: 'LPU Main Ground', entryFee: '₹800 per team', capacity: 24, registrations: [], description: 'Fast-paced football for teams ready to own the pitch.' },
    { id: 'aagaz-badminton-open', title: 'Aagaz Badminton Open', sport: 'Badminton', format: 'Singles · Individual entry', dates: '1 November 2026', deadline: '2026-10-25', venue: 'LPU Indoor Stadium', entryFee: '₹150 per player', capacity: 64, registrations: [], description: 'An open singles draw for every level of campus player.' }
  ],
  events: [
    { id: 'event-football', date: '2026-09-24', sport: 'Football · Inter-University', title: 'Aagaz XI vs Punjab University', venue: 'LPU Main Ground', time: '6:30 PM', registrations: [] },
    { id: 'event-kabaddi', date: '2026-09-27', sport: 'Kabaddi · Inter-College', title: 'Aagaz Raiders vs Campus Panthers', venue: 'LPU Indoor Stadium', time: '5:00 PM', registrations: [] },
    { id: 'event-cricket', date: '2026-10-04', sport: 'Cricket · University Cup', title: 'Aagaz Titans vs Tech Warriors', venue: 'LPU Cricket Ground', time: '9:00 AM', registrations: [] }
  ],
  liveMatches: [
    { id: 'live-kabaddi', sport: 'Kabaddi', period: '2nd Half · 28:14', home: 'Aagaz Raiders', away: 'Campus Bulls', homeScore: 28, awayScore: 24, venue: 'LPU Indoor Stadium', isLive: true },
    { id: 'live-basketball', sport: 'Basketball', period: 'Q3 · 04:52', home: 'Aagaz Hoops', away: 'North Uni', homeScore: 62, awayScore: 59, venue: 'LPU Court 1', isLive: true }
  ],
  members: [],
  enquiries: [],
  gallery: [
    { id: 'gallery-kabaddi', label: 'Kabaddi', color: '#007a87' }, { id: 'gallery-football', label: 'Football', color: '#315373' }, { id: 'gallery-cricket', label: 'Cricket', color: '#444e86' }, { id: 'gallery-volleyball', label: 'Volleyball', color: '#006c86' }, { id: 'gallery-badminton', label: 'Badminton', color: '#216079' }
  ],
  teams: [],
  staffUsers: [],
  loginEvents: []
};

function ensureData() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR); if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2)); }
function readData() { ensureData(); const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); let changed = false; if (!Array.isArray(data.tournaments)) { data.tournaments = initialData.tournaments; changed = true; } if (!Array.isArray(data.teams)) { data.teams = []; changed = true; } if (!Array.isArray(data.staffUsers)) { data.staffUsers = []; changed = true; } if (!Array.isArray(data.loginEvents)) { data.loginEvents = []; changed = true; } if (!data.staffUsers.length) { const password = process.env.STAFF_DEFAULT_PASSWORD || ADMIN_PASSWORD; data.staffUsers = [{ id: 'staff-admin', name: 'Aagaz Admin', email: 'admin@aagaz.in', role: 'super_admin', passwordHash: hashPassword(password) }, { id: 'staff-tournaments', name: 'Tournament Manager', email: 'tournaments@aagaz.in', role: 'tournament_manager', passwordHash: hashPassword(password) }, { id: 'staff-fixtures', name: 'Fixture Manager', email: 'fixtures@aagaz.in', role: 'fixture_manager', passwordHash: hashPassword(password) }, { id: 'staff-scores', name: 'Scorekeeper', email: 'scores@aagaz.in', role: 'scorekeeper', passwordHash: hashPassword(password) }]; changed = true; } if (changed) writeData(data); return data; }
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function id(prefix) { return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`; }
function send(res, status, value, type = 'application/json') { res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(value) : value); }
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function validText(value, max = 500) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max; }
function isAdmin(req) { const token = (req.headers.authorization || '').replace('Bearer ', ''); return sessions.has(token); }
function staffSession(req) { const token = (req.headers.authorization || '').replace('Bearer ', ''); const session = sessions.get(token); return session && session.type === 'staff' ? session : null; }
function canManage(req, roles) { const session = staffSession(req); return Boolean(session && roles.includes(session.role)); }
function teamSession(req) { const token = (req.headers.authorization || '').replace('Bearer ', ''); const session = sessions.get(`team:${token}`); return session && session.type === 'participant' ? session : null; }
function recordLogin(data, type, account) { const loggedAt = new Date().toISOString(); account.loginCount = (account.loginCount || 0) + 1; account.lastLoginAt = loggedAt; data.loginEvents.unshift({ id: id('login'), type, accountId: account.id, email: account.email, loggedAt }); data.loginEvents = data.loginEvents.slice(0, 1000); }
function safeAdminData(data, user) { return { ...data, teams: data.teams.map(({ passwordHash, ...team }) => team), staffUsers: data.staffUsers.map(({ passwordHash, ...staff }) => staff), loginEvents: data.loginEvents, analytics: { totalParticipantAccounts: data.teams.length, totalStaffAccounts: data.staffUsers.length, totalLogins: data.loginEvents.length, participantLogins: data.loginEvents.filter((event) => event.type === 'participant').length, staffLogins: data.loginEvents.filter((event) => event.type === 'staff').length, lastLoginAt: data.loginEvents[0]?.loggedAt || null }, user }; }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; }
function passwordMatches(password, stored) { const [salt, hash] = String(stored || '').split(':'); if (!salt || !hash) return false; const derived = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex')); }
function publicData(data) { return { tournaments: data.tournaments.map(({ registrations, ...tournament }) => ({ ...tournament, registrationCount: registrations.length })), events: data.events.map(({ registrations, ...event }) => ({ ...event, registrationCount: registrations.length })), liveMatches: data.liveMatches, gallery: data.gallery }; }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  try {
    if (pathname === '/api/public' && req.method === 'GET') return send(res, 200, publicData(readData()));
    if (pathname === '/api/contact' && req.method === 'POST') {
      const input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !validText(input.message, 2000) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Please enter a valid name, email, and message.' });
      const data = readData(); data.enquiries.unshift({ id: id('enquiry'), name: input.name.trim(), email: input.email.trim(), message: input.message.trim(), createdAt: new Date().toISOString(), status: 'new' }); writeData(data); return send(res, 201, { message: 'Thanks — your message has been received.' });
    }
    if (pathname === '/api/memberships' && req.method === 'POST') {
      const input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !validText(input.course, 120) || !validText(input.sport, 60) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Complete all membership fields with a valid email.' });
      const data = readData(); if (data.members.some(m => m.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'An application with this email already exists.' });
      data.members.unshift({ id: id('member'), name: input.name.trim(), email: input.email.trim(), course: input.course.trim(), sport: input.sport.trim(), phone: (input.phone || '').trim(), createdAt: new Date().toISOString(), status: 'pending' }); writeData(data); return send(res, 201, { message: 'Application submitted. The sports office will contact you soon.' });
    }
    if (pathname.match(/^\/api\/tournaments\/[^/]+\/register$/) && req.method === 'POST') {
      const tournamentId = pathname.split('/')[3], input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !validText(input.course, 120) || !validText(input.entryType, 30) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Complete all required fields with a valid email.' });
      const data = readData(), tournament = data.tournaments.find(t => t.id === tournamentId); if (!tournament) return send(res, 404, { error: 'Tournament not found.' }); if (tournament.registrations.length >= tournament.capacity) return send(res, 409, { error: 'This tournament is full.' }); if (tournament.registrations.some(r => r.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'You already have an entry in this tournament.' }); if (input.entryType === 'Team' && !validText(input.teamName, 80)) return send(res, 400, { error: 'Enter your team name to continue.' });
      tournament.registrations.push({ id: id('entry'), name: input.name.trim(), email: input.email.trim(), course: input.course.trim(), entryType: input.entryType.trim(), teamName: (input.teamName || '').trim(), phone: (input.phone || '').trim(), createdAt: new Date().toISOString(), status: 'pending' }); writeData(data); return send(res, 201, { message: `Entry received for ${tournament.title}. The organisers will review it shortly.` });
    }
    if (pathname.match(/^\/api\/events\/[^/]+\/register$/) && req.method === 'POST') {
      const eventId = pathname.split('/')[3], input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Please enter your name and university email.' });
      const data = readData(), event = data.events.find(e => e.id === eventId); if (!event) return send(res, 404, { error: 'Event not found.' }); if (event.registrations.some(r => r.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'You are already registered for this fixture.' });
      event.registrations.push({ id: id('registration'), name: input.name.trim(), email: input.email.trim(), createdAt: new Date().toISOString() }); writeData(data); return send(res, 201, { message: `You are registered for ${event.title}.` });
    }
    if (pathname === '/api/teams/register' && req.method === 'POST') {
      const input = await body(req); const name = input.name || input.teamName; if (!validText(name, 100) || !validText(input.email, 160) || !validText(input.password, 120) || input.password.length < 8 || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Enter your name, valid email, and an 8-character password.' });
      const data = readData(); if (data.teams.some(team => team.email.toLowerCase() === input.email.trim().toLowerCase())) return send(res, 409, { error: 'A team account with this email already exists.' });
      const team = { id: id('team'), teamName: name.trim(), captainName: name.trim(), email: input.email.trim().toLowerCase(), passwordHash: hashPassword(input.password), createdAt: new Date().toISOString(), status: 'pending', members: [{ name: name.trim(), email: input.email.trim().toLowerCase(), role: 'Captain' }] }; data.teams.unshift(team); writeData(data); return send(res, 201, { message: 'Account created. Log in to continue.' });
    }
    if (pathname === '/api/teams/login' && req.method === 'POST') {
      const input = await body(req), data = readData(), team = data.teams.find(item => item.email === String(input.email || '').trim().toLowerCase()); if (!team || !passwordMatches(input.password, team.passwordHash)) return send(res, 401, { error: 'Incorrect team email or password.' }); recordLogin(data, 'participant', team); writeData(data); const token = crypto.randomBytes(24).toString('hex'); sessions.set(`team:${token}`, { type: 'participant', teamId: team.id, createdAt: Date.now() }); return send(res, 200, { token, team: { id: team.id, teamName: team.teamName, captainName: team.captainName, email: team.email, status: team.status, loginCount: team.loginCount, lastLoginAt: team.lastLoginAt } });
    }
    if (pathname === '/api/teams/me' && req.method === 'GET') { const session = teamSession(req); if (!session) return send(res, 401, { error: 'Team login required.' }); const data = readData(), team = data.teams.find(item => item.id === session.teamId); if (!team) return send(res, 404, { error: 'Team not found.' }); const { passwordHash, ...safeTeam } = team; return send(res, 200, safeTeam); }
    if (pathname === '/api/teams/members' && req.method === 'POST') { const session = teamSession(req); if (!session) return send(res, 401, { error: 'Team login required.' }); const input = await body(req); if (!validText(input.name, 100) || !validText(input.email, 160) || !/^\S+@\S+\.\S+$/.test(input.email)) return send(res, 400, { error: 'Enter a player name and valid email.' }); const data = readData(), team = data.teams.find(item => item.id === session.teamId); if (!team) return send(res, 404, { error: 'Team not found.' }); if (!Array.isArray(team.members)) team.members = []; if (team.members.some(member => member.email === input.email.trim().toLowerCase())) return send(res, 409, { error: 'This player is already on your team.' }); team.members.push({ name: input.name.trim(), email: input.email.trim().toLowerCase(), role: 'Player' }); writeData(data); return send(res, 201, { message: `${input.name.trim()} added to your team.`, member: team.members.at(-1) }); }
    if (pathname === '/api/auth/login' && req.method === 'POST') { const input = await body(req), data = readData(), user = data.staffUsers.find(item => item.email === String(input.email || '').trim().toLowerCase()); if (!user || !passwordMatches(input.password, user.passwordHash)) return send(res, 401, { error: 'Incorrect staff email or password.' }); recordLogin(data, 'staff', user); writeData(data); const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, { type: 'staff', role: user.role, userId: user.id, createdAt: Date.now() }); return send(res, 200, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, loginCount: user.loginCount, lastLoginAt: user.lastLoginAt } }); }
    if (pathname === '/api/admin/login' && req.method === 'POST') { const input = await body(req); if (input.password !== ADMIN_PASSWORD) return send(res, 401, { error: 'Incorrect password.' }); const data = readData(), user = data.staffUsers.find((item) => item.role === 'super_admin'); recordLogin(data, 'staff', user); writeData(data); const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, { type: 'staff', role: 'super_admin', userId: 'staff-admin', createdAt: Date.now() }); return send(res, 200, { token, user: { name: 'Aagaz Admin', role: 'super_admin' } }); }
    if (pathname === '/api/admin/data' && req.method === 'GET') { const session = staffSession(req); if (!session) return send(res, 401, { error: 'Sign in required.' }); const data = readData(); return send(res, 200, safeAdminData(data, session)); }
    if (pathname === '/api/admin/live-matches' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'scorekeeper'])) return send(res, 403, { error: 'Scorekeeper access required.' }); const matches = await body(req); if (!Array.isArray(matches)) return send(res, 400, { error: 'Invalid matches.' }); const data = readData(); data.liveMatches = matches.map(m => ({ id: m.id || id('live'), sport: String(m.sport || 'Match').slice(0, 60), period: String(m.period || 'Starting soon').slice(0, 80), home: String(m.home || 'Home').slice(0, 80), away: String(m.away || 'Away').slice(0, 80), homeScore: Number(m.homeScore) || 0, awayScore: Number(m.awayScore) || 0, venue: String(m.venue || 'University Campus').slice(0, 120), streamUrl: validText(m.streamUrl, 500) ? m.streamUrl.trim() : '', isLive: Boolean(m.isLive) })); writeData(data); return send(res, 200, { message: 'Live scores saved.' }); }
    if (pathname === '/api/admin/events' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'fixture_manager'])) return send(res, 403, { error: 'Fixture manager access required.' }); const events = await body(req); if (!Array.isArray(events)) return send(res, 400, { error: 'Invalid events.' }); const data = readData(); data.events = events.map(e => ({ id: e.id || id('event'), tournamentId: String(e.tournamentId || '').slice(0, 100), date: String(e.date || '').slice(0, 10), sport: String(e.sport || '').slice(0, 100), title: String(e.title || '').slice(0, 160), venue: String(e.venue || '').slice(0, 140), time: String(e.time || '').slice(0, 30), registrations: e.registrations || [] })); writeData(data); return send(res, 200, { message: 'Fixtures saved.' }); }
    if (pathname === '/api/admin/tournaments' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'tournament_manager'])) return send(res, 403, { error: 'Tournament manager access required.' }); const tournaments = await body(req); if (!Array.isArray(tournaments)) return send(res, 400, { error: 'Invalid tournaments.' }); const data = readData(); data.tournaments = tournaments.map(t => ({ id: t.id || id('tournament'), title: String(t.title || 'Aagaz Tournament').slice(0, 140), sport: String(t.sport || 'Sport').slice(0, 50), format: String(t.format || 'Open entry').slice(0, 80), dates: String(t.dates || '').slice(0, 70), deadline: String(t.deadline || '').slice(0, 10), venue: String(t.venue || 'LPU Campus').slice(0, 140), entryFee: String(t.entryFee || 'TBA').slice(0, 40), capacity: Math.max(1, Number(t.capacity) || 16), description: String(t.description || '').slice(0, 300), registrations: t.registrations || [] })); writeData(data); return send(res, 200, { message: 'Tournaments saved.' }); }
    if (pathname === '/api/admin/gallery' && req.method === 'PUT') { if (!isAdmin(req)) return send(res, 401, { error: 'Sign in required.' }); const gallery = await body(req); if (!Array.isArray(gallery)) return send(res, 400, { error: 'Invalid gallery.' }); const data = readData(); data.gallery = gallery.map(item => ({ id: item.id || id('gallery'), label: String(item.label || 'Aagaz').slice(0, 50), color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#006c86' })); writeData(data); return send(res, 200, { message: 'Gallery saved.' }); }
    if (pathname === '/api/admin/member-status' && req.method === 'PUT') { if (!canManage(req, ['super_admin'])) return send(res, 403, { error: 'Admin access required.' }); const input = await body(req), data = readData(), member = data.members.find(m => m.id === input.id); if (!member || !['pending','approved','declined'].includes(input.status)) return send(res, 400, { error: 'Invalid member update.' }); member.status = input.status; writeData(data); return send(res, 200, { message: 'Membership status updated.' }); }
    if (pathname === '/api/admin/tournament-entry-status' && req.method === 'PUT') { if (!canManage(req, ['super_admin', 'tournament_manager'])) return send(res, 403, { error: 'Tournament manager access required.' }); const input = await body(req), data = readData(), entry = data.tournaments.flatMap(t => t.registrations).find(r => r.id === input.id); if (!entry || !['pending','approved','declined'].includes(input.status)) return send(res, 400, { error: 'Invalid entry update.' }); entry.status = input.status; writeData(data); return send(res, 200, { message: 'Tournament entry updated.' }); }
    if (pathname === '/api/admin/logout' && req.method === 'POST') { sessions.delete((req.headers.authorization || '').replace('Bearer ', '')); return send(res, 200, { message: 'Signed out.' }); }
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
});
server.listen(PORT, () => console.log(`Aagaz Sports Club running at http://localhost:${PORT}`));
