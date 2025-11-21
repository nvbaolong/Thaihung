
// CẤU HÌNH SUPABASE
// Vui lòng thay thế bằng URL và Key thực của bạn
const SUPABASE_URL = 'https://opuefitgxbavlzfobecc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdWVmaXRneGJhdmx6Zm9iZWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDIxODEsImV4cCI6MjA3OTI3ODE4MX0.I0QLDWOgwsC4XtPFFQ5U6unzWwc4iO_tIOZ2NVrXAtc';

let supabase = null;

if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.warn('Chưa cấu hình Supabase URL và Key trong supabase-client.js');
}

window.supabaseClient = supabase;
