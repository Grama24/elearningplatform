import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { answers } = await req.json();

    const finalQuiz = await db.finalQuiz.findUnique({
      where: { courseId: params.courseId },
      include: { questions: { include: { answers: true } } },
    });

    if (!finalQuiz) {
      return new NextResponse('Quiz not found', { status: 404 });
    }

    let score = 0;
    for (const question of finalQuiz.questions) {
      const userAnswer = answers[question.id];
      const correctAnswer = question.answers.find(a => a.isCorrect);
      if (userAnswer === correctAnswer?.id) {
        score++;
      }
    }

    const isPassed = score >= finalQuiz.minScore;

    // Salvăm rezultatul în FinalQuizResult
    await db.finalQuizResult.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId: params.courseId,
        },
      },
      update: {
        score,
        isPassed,
      },
      create: {
        userId,
        courseId: params.courseId,
        score,
        isPassed,
      },
    });

    return NextResponse.json({ score, isPassed });
  } catch (error) {
    console.error('[FINAL_QUIZ_SUBMIT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 