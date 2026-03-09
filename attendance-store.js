// ── AttendanceStore ────────────────────────────────────────────
// Shared module between worker-timeinout.js and worker-attendance.js
// Connected to Supabase 'attendance' table

const AttendanceStore = (() => {

  const CUTOFF_KEY = 'agrismart_attendance_cutoff';

  // ── Helpers: get current worker_id from session ────────────
  function getWorkerId() {
    const session = Auth.getSession();
    return session?.worker_id || null;
  }

  // ── Cutoff time (kept in localStorage per device) ──────────
  function getCutoff() {
    return localStorage.getItem(CUTOFF_KEY) || '07:00';
  }
  function setCutoff(time) {
    localStorage.setItem(CUTOFF_KEY, time);
  }

  // ── Today key ──────────────────────────────────────────────
  function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }

  // ── Format helpers ─────────────────────────────────────────
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

  // ── Status logic ───────────────────────────────────────────
  function calcStatus(timeInDate) {
    const [ch, cm]   = getCutoff().split(':').map(Number);
    const cutoffMins = ch * 60 + cm;
    const actualMins = timeInDate.getHours() * 60 + timeInDate.getMinutes();
    return actualMins <= cutoffMins ? 'present' : 'late';
  }

  // ── Total hours ────────────────────────────────────────────
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

  // ── Convert HH:MM AM/PM → HH:MM:SS for Supabase time field ─
  function toDbTime(str) {
    const [time, ampm] = str.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
  }

  // ── Get all logs for current worker ────────────────────────
  async function getLogs() {
    const workerId = getWorkerId();
    if (!workerId) return [];
    const { data, error } = await window.db
      .from('attendance')
      .select('*')
      .eq('worker_id', workerId)
      .order('date', { ascending: false });
    if (error) { console.error('[AttendanceStore] getLogs:', error.message); return []; }
    // Map DB rows to the shape the UI expects
    return (data || []).map(row => ({
      dateKey : row.date,
      date    : formatDate(new Date(row.date + 'T00:00:00')),
      day     : formatDay(new Date(row.date + 'T00:00:00')),
      timeIn  : row.time_in  ? formatDbTime(row.time_in)  : '--',
      timeOut : row.time_out ? formatDbTime(row.time_out) : '--',
      total   : row.time_in && row.time_out
                  ? calcTotalHours(formatDbTime(row.time_in), formatDbTime(row.time_out))
                  : (row.time_in ? 'In progress' : '--'),
      status  : row.status,
      active  : row.time_in && !row.time_out,
      _id     : row.id,
    }));
  }

  // ── Convert HH:MM:SS → HH:MM AM/PM for display ─────────────
  function formatDbTime(timeStr) {
    let [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  // ── Get today's log for current worker ─────────────────────
  async function getTodayLog() {
    const workerId = getWorkerId();
    if (!workerId) return null;
    const today = getTodayKey();
    const { data, error } = await window.db
      .from('attendance')
      .select('*')
      .eq('worker_id', workerId)
      .eq('date', today)
      .maybeSingle();
    if (error) { console.error('[AttendanceStore] getTodayLog:', error.message); return null; }
    if (!data) return null;
    return {
      dateKey : data.date,
      date    : formatDate(new Date(data.date + 'T00:00:00')),
      day     : formatDay(new Date(data.date + 'T00:00:00')),
      timeIn  : data.time_in  ? formatDbTime(data.time_in)  : '--',
      timeOut : data.time_out ? formatDbTime(data.time_out) : '--',
      total   : data.time_in && data.time_out
                  ? calcTotalHours(formatDbTime(data.time_in), formatDbTime(data.time_out))
                  : (data.time_in ? 'In progress' : '--'),
      status  : data.status,
      active  : !!(data.time_in && !data.time_out),
      _id     : data.id,
    };
  }

  // ── Time In ────────────────────────────────────────────────
  async function timeIn() {
    const workerId = getWorkerId();
    if (!workerId) return { success: false, error: 'No worker profile found. Please contact admin.' };

    const today = getTodayKey();
    // Check for existing record
    const existing = await getTodayLog();
    if (existing) return { success: false, error: 'Already timed in today.' };

    const now    = new Date();
    const status = calcStatus(now);

    const { data, error } = await window.db
      .from('attendance')
      .insert({
        worker_id : workerId,
        date      : today,
        time_in   : toDbTime(formatTime(now)),
        status    : status,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    const entry = {
      dateKey : today,
      date    : formatDate(now),
      day     : formatDay(now),
      timeIn  : formatTime(now),
      timeOut : '--',
      total   : 'In progress',
      status,
      active  : true,
      _id     : data.id,
    };
    return { success: true, entry };
  }

  // ── Time Out ───────────────────────────────────────────────
  async function timeOut() {
    const workerId = getWorkerId();
    if (!workerId) return { success: false, error: 'No worker profile found.' };

    const todayLog = await getTodayLog();
    if (!todayLog)          return { success: false, error: 'No time-in record found for today.' };
    if (!todayLog.active)   return { success: false, error: 'Already timed out today.' };

    const now        = new Date();
    const timeOutStr = formatTime(now);
    const total      = calcTotalHours(todayLog.timeIn, timeOutStr);

    const { error } = await window.db
      .from('attendance')
      .update({
        time_out : toDbTime(timeOutStr),
        notes    : `Total: ${total}`,
      })
      .eq('id', todayLog._id);

    if (error) return { success: false, error: error.message };

    const entry = { ...todayLog, timeOut: timeOutStr, total, active: false };
    return { success: true, entry };
  }

  // ── State checkers (async) ─────────────────────────────────
  async function isTimedInToday()  { const l = await getTodayLog(); return l ?  l.active : false; }
  async function isTimedOutToday() { const l = await getTodayLog(); return l ? !l.active : false; }

  return {
    getLogs, getTodayLog, getTodayKey,
    timeIn, timeOut,
    isTimedInToday, isTimedOutToday,
    getCutoff, setCutoff,
  };

})();