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
      }
    });
    
    if (!certificate) {
      return new NextResponse("Certificate not found", { status: 404 });
    }
    
    // Obținem informațiile despre curs separat
    const course = await db.course.findUnique({
      where: {
        id: courseId
      }
    });

    // Obținem categoria cursului dacă există
    const category = course?.categoryId ? await db.category.findUnique({
      where: {
        id: course.categoryId
      }
    }) : null;
    
    // Formatăm răspunsul pentru a include toate informațiile necesare
    const response = {
      courseId: certificate.courseId,
      userId: certificate.userId,
      timestamp: new Date(certificate.issuedAt).getTime() / 1000,
      exists: true,
      courseName: certificate.courseName,
      categoryName: certificate.categoryName,
      blockchainTx: certificate.blockchainTx,
      txStatus: certificate.txStatus || "pending",
      txError: certificate.txError,
      issuedAt: certificate.issuedAt,
      courseDetails: {
        title: course?.title || certificate.courseName,
        description: course?.description || "Descriere indisponibilă",
        imageUrl: course?.imageUrl || "/placeholder.png",
        categoryName: category?.name || certificate.categoryName,
        teacherId: course?.userId
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("[CERTIFICATE_LOCAL_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 