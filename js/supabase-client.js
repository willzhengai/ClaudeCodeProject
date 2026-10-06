// === Supabase Client Initialization ===

const SUPABASE_URL = 'https://czzvvqtyoifqccbksitg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6enZ2cXR5b2lmcWNjYmtzaXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDc4MDAsImV4cCI6MjA5MDkyMzgwMH0.WHZoKhT5gB69G8VwlbzZQBCPhVL5l-W1cXJAoCyhzLI';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
