
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseWebsite } from '../types';

const supabaseUrl = process.env.VITE_SUPABASE_PROJECT_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase URL or Anon Key is not configured correctly. " +
    "Please set the VITE_SUPABASE_PROJECT_URL and VITE_SUPABASE_ANON_KEY environment variables. " +
    "Website management features may not work or will be unavailable."
  );
} else {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client. Check environment variables.", e);
  }
}

export const supabase = supabaseInstance; // Export the potentially null instance

export const fetchWebsitesFromSupabase = async (): Promise<SupabaseWebsite[]> => {
  if (!supabase) {
    console.error("Supabase client is not initialized. Check environment variables.");
    return [];
  }
  const { data, error } = await supabase
    .from('websites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching websites:', error);
    return [];
  }
  return data || [];
};

export const addWebsiteToSupabase = async (url: string): Promise<SupabaseWebsite | null> => {
  if (!supabase) {
    console.error("Supabase client is not initialized. Check environment variables.");
    return null;
  }
  const { data, error } = await supabase
    .from('websites')
    .insert([{ url: url }])
    .select()
    .single();

  if (error) {
    console.error('Error adding website:', error);
    if (error.code === '23505') { 
      throw new Error(`Website ${url} already exists.`);
    }
    throw new Error(`Failed to add website: ${error.message}`);
  }
  return data;
};

export const removeWebsiteFromSupabase = async (id: number): Promise<boolean> => {
  if (!supabase) {
    console.error("Supabase client is not initialized. Check environment variables.");
    return false;
  }
  const { error } = await supabase
    .from('websites')
    .delete()
    .match({ id: id });

  if (error) {
    console.error('Error removing website:', error);
    return false;
  }
  return true;
};