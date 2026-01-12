import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * TEMPORARY PRIVACY-ONLY MODE MIDDLEWARE
 * 
 * This middleware redirects all routes except the Privacy-related pages
 * to the Privacy page. This is a temporary measure to host a "Privacy Tool"
 * version of the site.
 * 
 * TO RESTORE NORMAL FUNCTIONALITY:
 * Simply delete or rename this middleware.ts file.
 */

// Routes that are allowed to be accessed
const ALLOWED_ROUTES = [
    '/',
    '/privacy',
    '/privacy-policy',
    '/terms',
    '/about-us',
];

// Static assets and API routes that should not be redirected
const EXCLUDED_PATTERNS = [
    '/_next',
    '/api',
    '/favicon',
    '/public',
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.webp',
    '.gif',
    '.woff',
    '.woff2',
    '.ttf',
    '.css',
    '.js',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static assets and API routes
    if (EXCLUDED_PATTERNS.some(pattern => pathname.includes(pattern))) {
        return NextResponse.next();
    }

    // Allow access to permitted routes
    if (ALLOWED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        return NextResponse.next();
    }

    // Redirect all other routes to /privacy
    const url = request.nextUrl.clone();
    url.pathname = '/privacy';
    return NextResponse.redirect(url);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
