import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verificăm dacă cursul există și este publicat
    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        isPublished: true,
      },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Verificăm dacă există deja o achiziție
    let purchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: params.courseId,
        },
      },
    });

    // Dacă achiziția nu există, o creăm
    if (!purchase) {
      try {
        purchase = await db.purchase.create({
          data: {
            userId,
            courseId: params.courseId,
          },
        });
        
        console.log("Purchase created manually:", purchase.id);
      } catch (error) {
        // Verificăm dacă eroarea este de tip P2002 (Unique constraint failed)
        if (
          error instanceof PrismaClientKnownRequestError && 
          error.code === "P2002"
        ) {
          // Dacă eroarea este că achiziția există deja, o tratăm ca un succes
          // O altă tranzacție (posibil webhook-ul) a creat deja achiziția
          console.log("Purchase already exists (concurrent creation)");
          
          // Căutăm din nou achiziția existentă
          purchase = await db.purchase.findUnique({
            where: {
              userId_courseId: {
                userId,
                courseId: params.courseId,
              },
            },
          });
        } else {
          // Dacă este altă eroare, o propagăm
          throw error;
        }
      }
    } else {
      console.log("Purchase already exists:", purchase.id);
    }

    return NextResponse.json({ purchase });
  } catch (error) {
    console.error("[CHECK_PURCHASE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 