// ── AttendanceStore ────────────────────────────────────────
// Shared module between worker-timeinout.js and worker-attendance.js
// [SUPABASE] Replace sessionStorage calls with Supabase table 'attendance_logs'

const AttendanceStore = (() => {

  const LOGS_KEY   = 'agrismart_attendance_logs';
  const CUTOFF_KEY = 'agrismart_attendance_cutoff';

  // ── Cutoff time ────────────────────────────────────────
  function getCutoff() {
    return sessionStorage.getItem(CUTOFF_KEY) || '07:00';
  }
  function setCutoff(time) {
    sessionStorage.setItem(CUTOFF_KEY, time);
  }

  // ── Logs ───────────────────────────────────────────────
  function getLogs() {
    const raw = sessionStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveLogs(logs) {
    sessionStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }

  // ── Today helpers ──────────────────────────────────────
  function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function getTodayLog() {
    return getLogs().find(l => l.dateKey === getTodayKey()) || null;
  }

  // ── Format helpers ─────────────────────────────────────
  function formatTime(date) {
    let h = date.getHours(), m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  function formatDate(date) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2,'0')}, ${date.getFullYear()}`;
  }
  function formatDay(date) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[date.getDay()];
  }

  // ── Status logic ───────────────────────────────────────
  function calcStatus(timeInDate) {
    const [ch, cm]   = getCutoff().split(':').map(Number);
    const cutoffMins = ch * 60 + cm;
    const actualMins = timeInDate.getHours() * 60 + timeInDate.getMinutes();
    return actualMins <= cutoffMins ? 'present' : 'late';
  }

  // ── Total hours ────────────────────────────────────────
  function calcTotalHours(timeInStr, timeOutStr) {
    function toMins(str) {
      const [time, ampm] = str.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
    const diff = toMins(timeOutStr) - toMins(timeInStr);
    if (diff <= 0) return '--';
    return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2,'0')}m`;
  }

  // ── Time In ────────────────────────────────────────────
  function timeIn() {
    const logs  = getLogs();
    const today = getTodayKey();
    if (logs.find(l => l.dateKey === today)) return { success: false, error: 'Already timed in today.' };
    const now   = new Date();
    const entry = {
      dateKey : today,
      date    : formatDate(now),
      day     : formatDay(now),
      timeIn  : formatTime(now),
      timeOut : '--',
      total   : 'In progress',
      status  : calcStatus(now),
      active  : true,
    };
    logs.unshift(entry);
    saveLogs(logs);
    return { success: true, entry };
  }

  // ── Time Out ───────────────────────────────────────────
  function timeOut() {
    const logs  = getLogs();
    const today = getTodayKey();
    const idx   = logs.findIndex(l => l.dateKey === today);
    if (idx === -1)        return { success: false, error: 'No time-in record found for today.' };
    if (!logs[idx].active) return { success: false, error: 'Already timed out today.' };
    const now         = new Date();
    logs[idx].timeOut = formatTime(now);
    logs[idx].total   = calcTotalHours(logs[idx].timeIn, logs[idx].timeOut);
    logs[idx].active  = false;
    saveLogs(logs);
    return { success: true, entry: logs[idx] };
  }

  // ── State checkers ─────────────────────────────────────
  function isTimedInToday()  { const l = getTodayLog(); return l ?  l.active : false; }
  function isTimedOutToday() { const l = getTodayLog(); return l ? !l.active : false; }

  return {
    getLogs, getTodayLog, getTodayKey,
    timeIn, timeOut,
    isTimedInToday, isTimedOutToday,
    getCutoff, setCutoff,
  };

})();