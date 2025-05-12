import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId: authUserId } = auth();
    
    if (!authUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Verificăm că avem userId
    if (!params.userId) {
      return new NextResponse("Missing userId parameter", { status: 400 });
    }
    
    // Căutăm certificatele în baza de date
    const certificates = await db.certificate.findMany({
      where: {
        userId: params.userId
      },
      include: {
        course: {
          include: {
            category: true
          }
        }
      }
    });
    
    // Formatăm certificatele pentru a fi compatibile cu cele din blockchain
    const formattedCertificates = certificates.map(cert => {
      // Verificăm dacă avem un curs valid
      const courseDetails = cert.course ? {
        title: cert.course.title,
        description: cert.course.description || "Descriere indisponibilă",
        imageUrl: cert.course.imageUrl || "/placeholder.png",
        categoryName: cert.course.category?.name || cert.categoryName,
        teacherId: cert.course.userId
      } : {
        title: cert.courseName,
        description: "Curs indisponibil",
        imageUrl: "/placeholder.png",
        categoryName: cert.categoryName || "Categorie indisponibilă",
        teacherId: null
      };

      return {
        courseId: cert.courseId,
        userId: cert.userId,
        timestamp: new Date(cert.issuedAt).getTime() / 1000,
        exists: true,
        courseName: cert.courseName,
        categoryName: cert.categoryName,
        blockchainTx: cert.blockchainTx,
        txStatus: cert.txStatus,
        txError: cert.txError,
        issuedAt: cert.issuedAt,
        courseDetails
      };
    });
    
    return NextResponse.json(formattedCertificates);
  } catch (error) {
    console.error("[CERTIFICATES_USER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 