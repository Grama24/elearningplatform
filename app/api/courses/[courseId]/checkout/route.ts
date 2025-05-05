import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await currentUser();
    console.log("[CHECKOUT] User:", user?.id);

    if (!user || !user.id || !user.emailAddresses?.[0]?.emailAddress) {
      console.log("[CHECKOUT] Unauthorized - Missing user data");
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        isPublished: true,
      }
    });

    console.log("[CHECKOUT] Course:", course?.id);

    if (!course) {
      console.log("[CHECKOUT] Course not found");
      return new NextResponse("Not found", { status: 404 })
    }

    const purchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: params.courseId,
        }
      }
    });

    if (purchase) {
      console.log("[CHECKOUT] Already purchased");
      return new NextResponse("Already purchased", { status: 400 })
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: "RON",
          product_data: {
            name: course.title,
            description: course.description!,
          },
          unit_amount: Math.round(course.price! * 100),
        }
      }
    ];

    console.log("[CHECKOUT] Line items:", line_items);

    let stripeCustomer = await db.stripeCustomer.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        stripeCustomerId: true,
      }
    });

    if (!stripeCustomer) {
      console.log("[CHECKOUT] Creating new Stripe customer");
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0].emailAddress,
      });

      stripeCustomer = await db.stripeCustomer.create({
        data: {
          userId: user.id,
          stripeCustomerId: customer.id,
        }
      });
    }

    console.log("[CHECKOUT] Using Stripe customer:", stripeCustomer.stripeCustomerId);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.id}?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.id}?canceled=1`,
      metadata: {
        courseId: course.id,
        userId: user.id,
      }
    });

    console.log("[CHECKOUT] Created session:", session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[COURSE_ID_CHECKOUT] Error:", error);
    return new NextResponse("Internal Error", { status: 500 })
  }
}