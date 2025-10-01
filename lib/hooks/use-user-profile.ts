"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types/supabase";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

/**
 * 获取用户资料的 Hook
 */
export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchProfile() {
      if (!userId) return;

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (!isMounted) return;

        if (fetchError) throw fetchError;
        setProfile(data);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to fetch profile")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { profile, loading, error };
}
