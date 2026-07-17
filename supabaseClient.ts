import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials
const supabaseUrl = 'https://wmhuetfqmlpobbnsqorr.supabase.co/rest/v1/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtaHVldGZxbWxwb2JibnNxb3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzcxNTgsImV4cCI6MjA5OTcxMzE1OH0.f_a247jJYG2edXuAr4kNTqrbo03mbOXLEgCAmHkjgfU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
