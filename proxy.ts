import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isValidCategorySlug } from '@/lib/seo/categories';

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // CSRF protection for state-changing API routes
  // Allows same-origin requests (Origin matches) or requests with X-Requested-With header
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/payments/webhook') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  ) {
    const origin = request.headers.get('origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const sameOrigin = origin && (
      origin === siteUrl ||
      origin === 'http://localhost:3000' ||
      (siteUrl.startsWith('https://') && origin === siteUrl.replace('https://', 'http://'))
    );
    if (!sameOrigin) {
      const requestedWith = request.headers.get('x-requested-with')?.toLowerCase();
      if (requestedWith !== 'xmlhttprequest') {
        return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
      }
    }
  }

  if (pathname === '/productos') {
    const categoria = searchParams.get('categoria');
    const q = searchParams.get('q');
    if (categoria && isValidCategorySlug(categoria) && !q) {
      const url = request.nextUrl.clone();
      url.pathname = `/categoria/${categoria}`;
      url.search = '';
      return NextResponse.redirect(url, 308);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Si el refresh token no es válido, limpiar la sesión para evitar el error en logs
  if (authError?.status === 400 || authError?.message?.includes('Refresh Token Not Found')) {
    await supabase.auth.signOut();
    return supabaseResponse;
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!profile || profile.rol !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect profile route
  if (request.nextUrl.pathname.startsWith('/perfil')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/perfil/:path*', '/productos'],
};
