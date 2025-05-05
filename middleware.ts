"use client";

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Această funcție nu permite accesul utilizatorilor neautentificați la aceste rute
export default clerkMiddleware((auth, request) => {
  const isPublic = isPublicRoute(request);

  if (!isPublic) {
    auth().protect();
  }
})

// Adăugăm mai multe rute publice, inclusiv webhook și rute de curs
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/test', 
  '/api/uploadthing', 
  '/api/webhook',
  '/api/courses(.*)',
  '/courses/(.*)'
])

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}