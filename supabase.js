// supabase.js — shared Supabase client used by all modules
const _sb = window.supabase.createClient(
  'https://wrmfnsyipdtihwlnrtou.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybWZuc3lpcGR0aWh3bG5ydG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTI1MzksImV4cCI6MjA4ODI2ODUzOX0.1u2v9DJTYBBNCGT1cmlHw7IqwK9kp5TQMf0k1WWGlfw'
);
window.db = _sb;