import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/types";
import { supabase } from "@/lib/supabase";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Session } from "@supabase/supabase-js";

async function fetchAuthedUser(accessToken: string): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();
  const looksLikeHtml =
    contentType.includes("text/html") ||
    trimmedBody.startsWith("<") ||
    trimmedBody.startsWith("<!DOCTYPE") ||
    trimmedBody.startsWith("<html");

  if (looksLikeHtml) {
    throw new Error("Received HTML response from /api/auth/user");
  }

  let parsedBody: unknown = null;

  if (trimmedBody.length > 0) {
    try {
      parsedBody = JSON.parse(trimmedBody);
    } catch (parseError) {
      throw new Error("Failed to parse JSON from /api/auth/user");
    }
  }

  if (!response.ok) {
    const message = (parsedBody as { message?: string } | null)?.message;
    const error = new Error(message || `Request failed with status ${response.status}`) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return parsedBody as User | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoaded(true);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const accessToken = session?.access_token;

  // Fetch user data from our database (only if signed in)
  const { data: dbUser, isLoading: dbLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user", accessToken],
    enabled: Boolean(session && accessToken),
    retry: 2,
    queryFn: () => fetchAuthedUser(accessToken!),
  });

  const isSignedIn = Boolean(session);
  const isAuthenticated = isSignedIn;
  const isAdmin = Boolean(dbUser?.isAdmin);
  const isLoading = !isLoaded || (isSignedIn && dbLoading);

  return {
    user: dbUser ?? null,
    email: session?.user?.email || dbUser?.email || null,
    isLoaded: isLoaded && (!isSignedIn || !dbLoading),
    isLoading,
    isAuthenticated,
    isSignedIn,
    isAdmin,
    error: error as Error | null,
    session,
  };
}
