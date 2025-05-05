import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BlockchainService } from "@/lib/blockchain";

export async function PUT(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = auth();
    const { isCompleted } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: params.chapterId,
        }
      },
      update: {
        isCompleted
      },
      create: {
        userId,
        chapterId: params.chapterId,
        isCompleted,
      }
    });

    // Verificăm dacă toate capitolele sunt completate
    if (isCompleted) {
      const publishedChapters = await db.chapter.findMany({
        where: {
          courseId: params.courseId,
          isPublished: true,
        },
        select: {
          id: true,
        },
      });

      const completedChapters = await db.userProgress.count({
        where: {
          userId,
          chapterId: {
            in: publishedChapters.map(chapter => chapter.id)
          },
          isCompleted: true,
        }
      });

      // Dacă toate capitolele sunt completate, generăm certificatul
      if (completedChapters === publishedChapters.length) {
        // Obținem detaliile cursului pentru a le folosi în certificat
        const course = await db.course.findUnique({
          where: {
            id: params.courseId,
            isPublished: true,
          },
          include: {
            category: true,
          },
        });

        if (course) {
          const blockchainService = new BlockchainService();
          
          // Emitem certificatul cu ID-ul cursului
          // În viitor, am putea actualiza contractul pentru a stoca mai multe informații
          await blockchainService.issueCertificate(params.courseId, userId);
          
          // Asociem certificatul cu cursul în baza de date locală pentru referință mai ușoară
          try {
            await db.certificate.upsert({
              where: {
                courseId_userId: {
                  courseId: params.courseId,
                  userId: userId
                }
              },
              update: {
                courseName: course.title,
                categoryName: course.category?.name || null,
                issuedAt: new Date(),
              },
              create: {
                courseId: params.courseId,
                userId: userId,
                courseName: course.title,
                categoryName: course.category?.name || null,
                issuedAt: new Date(),
              }
            });
          } catch (dbError) {
            // Eroarea în baza de date locală nu ar trebui să afecteze rezultatul operațiunii principale
            console.log("[CERTIFICATE_DB_ERROR]", dbError);
          }
        }
      }
    }

    return NextResponse.json(userProgress);
  } catch (error) {
    console.log("[CHAPTER_ID_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 })
  }
}