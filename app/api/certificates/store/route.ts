import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const body = await req.json();
    const { courseId, courseName, categoryName, blockchainTx } = body;
    
    if (!courseId || !courseName) {
      return new NextResponse("Missing courseId or courseName", { status: 400 });
    }
    
    // Stocăm certificatul în baza de date locală
    const certificate = await db.certificate.upsert({
      where: {
        courseId_userId: {
          courseId,
          userId
        }
      },
      update: {
        courseName,
        categoryName: categoryName || null,
        blockchainTx: blockchainTx || null,
        issuedAt: new Date()
      },
      create: {
        courseId,
        userId,
        courseName,
        categoryName: categoryName || null,
        blockchainTx: blockchainTx || null,
        issuedAt: new Date()
      }
    });
    
    return NextResponse.json(certificate);
  } catch (error) {
    console.error("[CERTIFICATE_STORE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 