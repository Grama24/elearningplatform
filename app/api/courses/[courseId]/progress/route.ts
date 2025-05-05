import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Obținem toate capitolele publicate ale cursului
    const publishedChapters = await db.chapter.findMany({
      where: {
        courseId: params.courseId,
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    // Obținem progresul utilizatorului pentru aceste capitole
    const userProgress = await db.userProgress.findMany({
      where: {
        userId,
        chapterId: {
          in: publishedChapters.map(chapter => chapter.id)
        },
        isCompleted: true,
      },
      select: {
        chapterId: true,
      },
    });

    // Calculăm procentajul de completare
    const totalChapters = publishedChapters.length;
    const completedChapters = userProgress.length;
    const progressPercentage = totalChapters > 0 
      ? Math.round((completedChapters / totalChapters) * 100) 
      : 0;

    return NextResponse.json({
      progressPercentage,
      completedChapters,
      totalChapters,
    });
  } catch (error) {
    console.log("[COURSE_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 