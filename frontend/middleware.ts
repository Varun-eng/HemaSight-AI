import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get the user session
  const { data: { user } } = await supabase.auth.getUser();

  // Protect the /dashboard routes (Patient)
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect the /doctor/dashboard routes (Doctor)
  if (!user && request.nextUrl.pathname.startsWith('/doctor/dashboard')) {
    return NextResponse.redirect(new URL('/doctor/login', request.url));
  }

  // If user is logged in, redirect away from login pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/doctor/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/doctor/dashboard/:path*', '/login', '/doctor/login'],
};