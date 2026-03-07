import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // WAITLIST MODE DISABLED - All routes are now accessible
    return NextResponse.next();

    const { pathname } = request.nextUrl;

    // Define allowed paths that should NOT be redirected
    const allowedPaths = [
        '/waitlist',
        '/api',       // Allow API routes (especially for waitlist submission)
        '/_next',     // Next.js internal assets
        '/favicon',   // Favicon
        '/images',    // Public images
    ];

    // Specific file extensions to allow (images, fonts, etc.)
    const allowedExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.ico', '.woff', '.woff2', '.ttf'];

    // Check if the current path starts with any allowed path
    const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));

    // Check if the current path ends with any allowed extension
    const isAllowedExtension = allowedExtensions.some(ext => pathname.endsWith(ext));

    // If path is NOT allowed and NOT an extension, redirect to /waitlist
    if (!isAllowedPath && !isAllowedExtension) {
        const url = request.nextUrl.clone();
        url.pathname = '/waitlist';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
