import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.warn('[Supabase] SUPABASE_URL is not set');
}

if (!supabaseServiceKey) {
  console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set');
}

// Server-side Supabase client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Extract user from request Authorization header
export async function getUserFromRequest(req: Request): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify the JWT token using Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error('[Supabase] Failed to verify token:', error);
      return null;
    }

    return {
      userId: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.error('[Supabase] Error verifying token:', error);
    return null;
  }
}

// Check if user is admin by looking up in database
export async function isUserAdmin(userId: string, prisma: any, email?: string): Promise<boolean> {
  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email },
        select: { isAdmin: true },
      });
    }

    return user?.isAdmin || false;
  } catch (error) {
    console.error('[Supabase] Error checking admin status:', error);
    return false;
  }
}
