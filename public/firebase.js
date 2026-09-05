import { firebaseConfig } from './firebase-config.js';

let authServices;
const baseUrl = () => firebaseConfig.databaseURL.replace(/\/$/, '');
const endpoint = path => `${baseUrl()}/${path}.json`;
async function authToken() { try { const service = await auth(); return service.auth.currentUser ? await service.auth.currentUser.getIdToken() : ''; } catch { return ''; } }
async function requestUrl(path, params = {}) { const token = await authToken(); const query = new URLSearchParams(params); if (token) query.set('auth', token); const suffix = query.toString(); return `${endpoint(path)}${suffix ? `?${suffix}` : ''}`; }
async function read(path, params) { const response = await fetch(await requestUrl(path, params)); if (!response.ok) throw new Error('Firebase Realtime Database 읽기에 실패했습니다. 규칙을 확인해 주세요.'); return response.json(); }
async function write(path, method, data) { const response = await fetch(await requestUrl(path), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error('Firebase에 저장하지 못했습니다. Realtime Database 규칙을 확인해 주세요.'); return response.json(); }
async function auth() { if (authServices) return authServices; const [{ initializeApp }, module] = await Promise.all([import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'), import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js')]); const app = initializeApp(firebaseConfig); authServices = { auth: module.getAuth(app), ...module }; return authServices; }

export async function getMenuFromFirestore() { return read('site/menu'); }
export async function createReservation(data) { const idx = crypto.randomUUID(); const record = { idx, r_name: data.r_name.trim(), r_date: data.r_date, rs_date: new Date().toISOString(), r_number: Number(data.r_number), r_tel: data.r_tel.replace(/\D/g, ''), r_status: 'r', r_content: data.r_content.trim() }; await write(`reservation/${idx}`, 'PUT', record); }
export async function loginAdmin(email, password) { const service = await auth(); return service.signInWithEmailAndPassword(service.auth, email, password); }
export async function logoutAdmin() { const service = await auth(); return service.signOut(service.auth); }
export function observeAdmin(callback) { auth().then(service => service.onAuthStateChanged(service.auth, callback)).catch(() => callback(null)); }
export async function getReservations() { const records = await read('reservation') || {}; return Object.entries(records).map(([idx, data]) => ({ idx, ...data })).sort((a, b) => new Date(a.r_date) - new Date(b.r_date)); }
export async function getReservationsByPhone(phone) { const normalized = phone.replace(/\D/g, ''); const records = await read('reservation', { orderBy: '"r_tel"', equalTo: `"${normalized}"` }) || {}; return Object.entries(records).map(([idx, data]) => ({ idx, ...data })).sort((a, b) => new Date(b.r_date) - new Date(a.r_date)); }
export async function updateReservationStatus(idx, r_status) { return write(`reservation/${idx}`, 'PATCH', { r_status }); }
