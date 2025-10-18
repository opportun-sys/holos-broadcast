import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'operator' | 'viewer';

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRoles([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        setRoles(data?.map(r => r.role as UserRole) || []);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const hasRole = (role: UserRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isOperator = hasRole('operator');
  const isViewer = hasRole('viewer');

  return {
    roles,
    hasRole,
    isAdmin,
    isOperator,
    isViewer,
    isLoading
  };
};
