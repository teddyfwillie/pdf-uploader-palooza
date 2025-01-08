import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export const UserProfile = () => {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session?.user) return null;

  return (
    <div className="border-b bg-sidebar p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>
            {profile?.full_name?.[0]?.toUpperCase() || session.user.email?.[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium">
            {profile?.full_name || 'Welcome'}
          </span>
          <span className="text-sm text-muted-foreground">
            {session.user.email}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={handleSignOut}>
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
};