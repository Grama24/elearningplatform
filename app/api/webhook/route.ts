import Stripe from "stripe";
import { headers } from "next/headers"
import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db"

// Această funcție asigură că fișierul este compilat ca o funcție API route de către Next.js
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Extrage corpul cererii și semnătura Stripe
    const body = await req.text();
    const signature = headers().get("Stripe-Signature") as string;

    console.log("[WEBHOOK] Received webhook request");

    let event: Stripe.Event;

    try {
      // Verifică semnătura pentru a confirma că evenimentul vine de la Stripe
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
      console.log("[WEBHOOK] Event constructed successfully:", event.type);
    } catch (error: any) {
      console.error("[WEBHOOK] Error constructing event:", error.message);
      return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session?.metadata?.userId;
    const courseId = session?.metadata?.courseId;

    console.log("[WEBHOOK] Session data:", {
      userId,
      courseId,
      paymentStatus: session.payment_status,
      sessionId: session.id
    });

    // Procesează doar evenimentele de finalizare a plății
    if (event.type === "checkout.session.completed") {
      if (!userId || !courseId) {
        console.error("[WEBHOOK] Missing metadata:", { userId, courseId });
        return new NextResponse(`Webhook Error: Missing metadata`, { status: 400 });
      }

      try {
        // Verifică dacă achiziția există deja
        const existingPurchase = await db.purchase.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
        });

        if (existingPurchase) {
          console.log("[WEBHOOK] Purchase already exists:", existingPurchase.id);
          return new NextResponse("Purchase already exists", { status: 200 });
        }

        // Creează achiziția în baza de date
        const purchase = await db.purchase.create({
          data: {
            courseId: courseId,
            userId: userId,
          }
        });
        console.log("[WEBHOOK] Purchase created successfully:", purchase.id);
      } catch (error) {
        console.error("[WEBHOOK] Error creating purchase:", error);
        return new NextResponse("Error creating purchase", { status: 500 });
      }
    } else {
      console.log("[WEBHOOK] Unhandled event type:", event.type);
    }

    // Returnează succes pentru toate tipurile de evenimente
    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("[WEBHOOK] Unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 