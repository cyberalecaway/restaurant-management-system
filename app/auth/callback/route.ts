import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/safe-next-path.mjs';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const providerError = request.nextUrl.searchParams.get('error');
  const requestedPath = request.nextUrl.searchParams.get('next') ?? '/';
  const next = safeNextPath(requestedPath, request.nextUrl.origin);
  if (providerError) return NextResponse.redirect(new URL('/login?error=oauth', request.url));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    return NextResponse.redirect(new URL('/login?error=auth', request.url));
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', request.url));
}
