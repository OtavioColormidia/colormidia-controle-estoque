import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseDataProvider } from '@/contexts/SupabaseDataContext';
import type { User } from '@supabase/supabase-js';

export default function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_authorized')
          .eq('user_id', userId)
          .single();
        setIsAuthorized(profile?.is_authorized || false);
      } catch {
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAuthorization(session.user.id);
      } else {
        setIsAuthorized(false);
        setAuthLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAuthorization(session.user.id);
      else setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    navigate('/auth');
    return null;
  }

  return (
    <SupabaseDataProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex flex-col min-w-0">
            <AppHeader />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </SupabaseDataProvider>
  );
}
