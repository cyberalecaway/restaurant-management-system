import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: claimResult } = await supabase.auth.getClaims();
  const claims = claimResult?.claims;
  const adminRoute = ['/dashboard', '/menu', '/orders', '/users', '/activity', '/reports', '/settings'].some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  if (adminRoute) {
    if (!claims) {
      const destination = request.nextUrl.clone();
      destination.pathname = '/login';
      destination.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(destination);
    }
    const userId = typeof claims.sub === 'string' ? claims.sub : '';
    const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', userId).maybeSingle();
    if (!profile || profile.status !== 'ACTIVE' || !['ADMIN', 'STAFF'].includes(profile.role)) {
      const destination = request.nextUrl.clone();
      destination.pathname = '/';
      destination.search = '';
      return NextResponse.redirect(destination);
    }
  }

  return response;
}
