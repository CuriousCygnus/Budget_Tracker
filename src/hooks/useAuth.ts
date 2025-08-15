import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';

// Safe supabase import with error handling
let supabase: any = null;
try {
  const { supabase: supabaseClient } = await import('../lib/supabase');
  supabase = supabaseClient;
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not properly configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        setError('Failed to connect to authentication service. Please check your internet connection and try again.');
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('Network error getting session:', err);
      setError('Network error: Unable to connect to authentication service. Please check your internet connection.');
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setError(null);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Authentication service not available' } };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { data, error };
    } catch (err) {
      console.error('Network error during sign up:', err);
      return { data: null, error: { message: 'Network error: Unable to create account. Please check your internet connection and try again.' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Authentication service not available' } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (err) {
      console.error('Network error during sign in:', err);
      return { data: null, error: { message: 'Network error: Unable to sign in. Please check your internet connection and try again.' } };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      return { error: { message: 'Authentication service not available' } };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      console.error('Network error during sign out:', err);
      return { error: { message: 'Network error: Unable to sign out. Please try refreshing the page.' } };
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  };
};