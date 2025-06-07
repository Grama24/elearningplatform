import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
        finalQuiz: {
          include: {
            questions: {
              include: {
                answers: true
              }
            }
          }
        }
      }
    });

    // Verificăm și relația direct
    const courseWithQuiz = await db.course.findUnique({
      where: {
        id: params.courseId
      },
      select: {
        id: true,
        title: true,
        finalQuiz: true
      }
    });

    return NextResponse.json({
      quiz,
      course,
      courseWithQuiz,
      courseId: params.courseId
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 