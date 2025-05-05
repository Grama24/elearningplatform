import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Obținem parametrii din URL
    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");
    const userIdParam = url.searchParams.get("userId");
    
    // Verificăm că avem parametrii necesari
    if (!courseId) {
      return new NextResponse("Missing courseId parameter", { status: 400 });
    }
    
    // Utilizăm userId-ul din autentificare, cu excepția cazului când un utilizator autentificat
    // (de exemplu un profesor) cere informații despre certificatul altui utilizator
    const targetUserId = userIdParam || userId;
    
    // Căutăm certificatul în baza de date
    const certificate = await db.certificate.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId: targetUserId
        }
      },
      include: {
        course: {
          include: {
            category: true
          }
        }
      }
    });
    
    if (!certificate) {
      return new NextResponse("Certificate not found", { status: 404 });
    }
    
    return NextResponse.json(certificate);
  } catch (error) {
    console.error("[CERTIFICATE_LOCAL_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 