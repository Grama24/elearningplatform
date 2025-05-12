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
    console.log("Received update request:", body);
    
    const { courseId, userId: certUserId, confirmed, txStatus, txError, blockchainTx } = body;
    
    if (!courseId || !certUserId) {
      console.log("Missing required fields:", { courseId, certUserId });
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
    
    console.log("Existing certificate:", existingCertificate);
    
    if (!existingCertificate) {
      console.log("Certificate not found for:", { courseId, certUserId });
      return new NextResponse("Certificate not found", { status: 404 });
    }
    
    // Pregătim datele pentru actualizare
    const updateData: any = {};
    
    // Adăugăm hash-ul tranzacției dacă a fost furnizat
    if (blockchainTx) {
      console.log("Updating blockchain tx:", blockchainTx);
      updateData.blockchainTx = blockchainTx;
    }
    
    // Adăugăm statusul tranzacției dacă a fost furnizat
    if (txStatus) {
      console.log("Updating tx status:", txStatus);
      updateData.txStatus = txStatus;
    }
    
    // Adăugăm eroarea tranzacției dacă a fost furnizată
    if (txError !== undefined) {
      console.log("Updating tx error:", txError);
      updateData.txError = txError;
    }
    
    console.log("Final update data:", updateData);
    
    // Dacă nu avem date pentru actualizare, returnăm certificatul existent
    if (Object.keys(updateData).length === 0) {
      console.log("No updates needed");
      return NextResponse.json(existingCertificate);
    }
    
    // Actualizăm certificatul cu noile date
    const updatedCertificate = await db.certificate.update({
      where: {
        courseId_userId: {
          courseId,
          userId: certUserId
        }
      },
      data: updateData
    });
    
    console.log("Certificate updated:", updatedCertificate);
    
    return NextResponse.json(updatedCertificate);
  } catch (error) {
    console.error("[CERTIFICATE_UPDATE_STATUS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 