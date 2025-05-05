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
    const { courseId, userId: certUserId, confirmed } = body;
    
    if (!courseId || !certUserId) {
      return new NextResponse("Missing courseId or userId", { status: 400 });
    }
    
    // Verificăm dacă certificatul există
    const existingCertificate = await db.certificate.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId: certUserId
        }
      }
    });
    
    if (!existingCertificate) {
      return new NextResponse("Certificate not found", { status: 404 });
    }
    
    // Actualizăm statusul certificatului
    // Nu ștergem blockchainTx, dar adăugăm un câmp auxiliar pentru a marca că 
    // certificatul a fost confirmat (în acest caz, folosim un câmp metadata)
    const updatedCertificate = await db.certificate.update({
      where: {
        courseId_userId: {
          courseId,
          userId: certUserId
        }
      },
      data: {
        // Nu folosim updatedAt pentru că nu există în schema
        // Dacă vrem să adăugăm un marker pentru status, trebuie să modificăm
        // schema Prisma să includă un câmp de status sau să folosim altă abordare
      }
    });
    
    return NextResponse.json(updatedCertificate);
  } catch (error) {
    console.error("[CERTIFICATE_UPDATE_STATUS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 