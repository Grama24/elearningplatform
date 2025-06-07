import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    // Verificăm direct quiz-ul
    const quiz = await db.finalQuiz.findUnique({
      where: {
        courseId: params.courseId
      },
      include: {
        questions: {
          include: {
            answers: true
          }
        }
      }
    });

    // Verificăm și cursul
    const course = await db.course.findUnique({
      where: {
        id: params.courseId
      },
      include: {
        finalQuiz: true
      }
    });

    return NextResponse.json({
      quiz,
      course,
      courseId: params.courseId
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
} 