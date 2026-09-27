import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminOnlyRoute, isCustomerOnlyRoute, isRmsRoute } from '@/lib/role-routing.mjs';

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const pathname = request.nextUrl.pathname;
  if (!url || !key) {
    return isRmsRoute(pathname) || isCustomerOnlyRoute(pathname)
      ? NextResponse.redirect(new URL('/login?error=configuration', request.url))
      : NextResponse.next({ request });
  }

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
  if (isRmsRoute(pathname) || isCustomerOnlyRoute(pathname)) {
    if (!claims) {
      const destination = request.nextUrl.clone();
      destination.pathname = '/login';
      destination.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(destination);
    }
    const userId = typeof claims.sub === 'string' ? claims.sub : '';
    const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', userId).maybeSingle();
    const allowedRole = isCustomerOnlyRoute(pathname)
      ? profile?.role === 'CUSTOMER'
      : profile?.role === 'ADMIN' || (profile?.role === 'STAFF' && !isAdminOnlyRoute(pathname));
    if (!profile || profile.status !== 'ACTIVE' || !allowedRole) {
      const destination = request.nextUrl.clone();
      destination.pathname = (profile?.role === 'ADMIN' && isCustomerOnlyRoute(pathname)) || (profile?.role === 'STAFF' && isAdminOnlyRoute(pathname)) ? '/dashboard' : '/';
      destination.search = '';
      return NextResponse.redirect(destination);
    }
  }

  return response;
}
