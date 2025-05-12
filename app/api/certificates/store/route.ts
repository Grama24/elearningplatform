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
    console.log("Received store request:", body);
    
    const { courseId, courseName, categoryName, blockchainTx, txStatus } = body;
    
    if (!courseId || !courseName) {
      console.log("Missing required fields:", { courseId, courseName });
      return new NextResponse("Missing courseId or courseName", { status: 400 });
    }
    
    console.log("Creating/updating certificate with:", {
      courseId,
      userId,
      courseName,
      categoryName,
      blockchainTx,
      txStatus
    });
    
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
        txStatus: txStatus || "pending",
        issuedAt: new Date()
      },
      create: {
        courseId,
        userId,
        courseName,
        categoryName: categoryName || null,
        blockchainTx: blockchainTx || null,
        txStatus: txStatus || "pending",
        issuedAt: new Date()
      }
    });
    
    console.log("Certificate stored:", certificate);
    
    return NextResponse.json(certificate);
  } catch (error) {
    console.error("[CERTIFICATE_STORE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 