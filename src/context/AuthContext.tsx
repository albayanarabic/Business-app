import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { syncEngine } from '../lib/syncEngine';

export interface BusinessEntity {
  id: string;
  name: string;
  ownerName?: string;
  tagline?: string;
  category?: string;
  phoneNumber?: string;
  address?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  logoUrl?: string;
  ownerId: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  business: BusinessEntity | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, businessName: string, fullName: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<BusinessEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();
  const businessRequests = useRef(new Map<string, Promise<BusinessEntity>>());

  const resolveBusiness = useCallback((account: User, requestedName?: string): Promise<BusinessEntity> => {
    const activeRequest = businessRequests.current.get(account.id);
    if (activeRequest) return activeRequest;

    const request = (async (): Promise<BusinessEntity> => {
    const { data: owned, error: ownedError } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', account.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ownedError) throw ownedError;

    let row = owned;
    if (!row) {
      const { data: membership, error: membershipError } = await supabase
        .from('business_members')
        .select('business_id, businesses(*)')
        .eq('user_id', account.id)
        .limit(1)
        .maybeSingle();
      if (membershipError) throw membershipError;
      const joined = membership?.businesses;
      row = (Array.isArray(joined) ? joined[0] : joined) ?? null;
    }

    if (!row) {
      const { data: created, error: createError } = await supabase
        .from('businesses')
        .insert({
          id: crypto.randomUUID(),
          user_id: account.id,
          owner_id: account.id,
          name: requestedName?.trim() || String(account.user_metadata.business_name || 'My Business'),
          owner_name: String(account.user_metadata.full_name || ''),
          tagline: 'Your Business. Your Records. Your Growth.',
        })
        .select('*')
        .single();
      if (createError) throw createError;
      row = created;
    }

    if (row.user_id === account.id) {
      const { error: memberError } = await supabase.from('business_members').upsert({
        business_id: row.id,
        user_id: account.id,
        role: 'owner',
      }, { onConflict: 'business_id,user_id' });
      if (memberError) throw memberError;
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: account.id,
      user_id: account.id,
      full_name: String(account.user_metadata.full_name || ''),
      email: account.email ?? '',
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    const entity: BusinessEntity = {
      id: row.id,
      name: row.name,
      ownerName: row.owner_name ?? undefined,
      tagline: row.tagline ?? undefined,
      category: row.category ?? undefined,
      phoneNumber: row.phone_number ?? undefined,
      address: row.address ?? undefined,
      bankName: row.bank_name ?? undefined,
      accountNumber: row.account_number ?? undefined,
      accountName: row.account_name ?? undefined,
      logoUrl: row.logo_url ?? undefined,
      ownerId: row.owner_id,
    };
    setBusiness(entity);
    syncEngine.setActiveAccount(account.id, entity.id);
    return entity;
    })();
    businessRequests.current.set(account.id, request);
    void request.then(
      () => businessRequests.current.delete(account.id),
      () => businessRequests.current.delete(account.id)
    );
    return request;
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      syncEngine.setActiveAccount(null, null);
      return;
    }

    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) {
        setBusiness(null);
        syncEngine.setActiveAccount(null, null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      if (event === 'INITIAL_SESSION') return;
      window.setTimeout(() => {
        void resolveBusiness(nextSession.user).catch((error: unknown) => {
          console.error('Unable to load the signed-in business:', messageOf(error));
          if (mounted) setBusiness(null);
        }).finally(() => {
          if (mounted) setIsLoading(false);
        });
      }, 0);
    });

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await resolveBusiness(data.session.user);
      } else {
        syncEngine.setActiveAccount(null, null);
      }
    }).catch((error: unknown) => {
      console.error('Unable to restore the Supabase session:', messageOf(error));
      if (mounted) {
        setSession(null);
        setUser(null);
        setBusiness(null);
        syncEngine.setActiveAccount(null, null);
      }
    }).finally(() => {
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, resolveBusiness]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isConfigured) return { error: 'Supabase credentials are not configured in environment variables.' };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { error: error.message };
      if (!data.user) return { error: 'Supabase did not return a user for this sign-in' };
      await resolveBusiness(data.user);
      return {};
    } catch (error) {
      return { error: messageOf(error) };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    businessName: string,
    fullName: string
  ): Promise<{ error?: string; message?: string }> => {
    if (!isConfigured) return { error: 'Supabase credentials are not configured in environment variables.' };
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), business_name: businessName.trim() } },
      });
      if (error) return { error: error.message };
      if (!data.user) return { error: 'Supabase did not return a user for this registration' };
      if (!data.session) {
        return { message: 'Check your email to confirm the account, then sign in to finish setup.' };
      }
      await resolveBusiness(data.user, businessName);
      return { message: 'Account created. Your records will sync after setup completes.' };
    } catch (error) {
      return { error: messageOf(error) };
    }
  };

  const signOut = async (): Promise<{ error?: string }> => {
    if (!isConfigured) return {};
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    setUser(null);
    setSession(null);
    setBusiness(null);
    syncEngine.setActiveAccount(null, null);
    return {};
  };

  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!isConfigured) return { error: 'Supabase credentials are not configured' };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/?tab=settings&reset=true`,
    });
    return error
      ? { error: error.message }
      : { message: 'Password reset link sent to your email address.' };
  };

  const refreshBusiness = async (): Promise<void> => {
    if (user) await resolveBusiness(user);
  };

  return (
    <AuthContext.Provider value={{
      user, session, business, isLoading, isConfigured, signIn, signUp, signOut, resetPassword, refreshBusiness,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
