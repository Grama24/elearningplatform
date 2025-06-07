import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const finalQuiz = await db.finalQuiz.findUnique({
      where: { courseId: params.courseId },
      include: { questions: { include: { answers: true } } },
    });

    if (!finalQuiz) {
      return new NextResponse('Quiz not found', { status: 404 });
    }

    return NextResponse.json(finalQuiz);
  } catch (error) {
    console.error('[FINAL_QUIZ_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const quizData = {
      minScore: 60,
      questions: [
        {
          text: "Care este unitatea de măsură pentru rezistență electrică?",
          answers: [
            { text: "Volt (V)", isCorrect: false },
            { text: "Amper (A)", isCorrect: false },
            { text: "Ohm (Ω)", isCorrect: true },
            { text: "Watt (W)", isCorrect: false }
          ]
        },
        {
          text: "Ce lege descrie relația dintre tensiune, curent și rezistență într-un circuit electric?",
          answers: [
            { text: "Legea lui Newton", isCorrect: false },
            { text: "Legea lui Ohm", isCorrect: true },
            { text: "Legea lui Kirchhoff", isCorrect: false },
            { text: "Legea lui Faraday", isCorrect: false }
          ]
        },
        {
          text: "Care dintre următoarele componente este folosită pentru a stoca energie electrică?",
          answers: [
            { text: "Rezistor", isCorrect: false },
            { text: "Condensator", isCorrect: true },
            { text: "Tranzistor", isCorrect: false },
            { text: "Diodă", isCorrect: false }
          ]
        }
      ]
    };

    // Verificăm dacă quiz-ul există deja
    const existingQuiz = await db.finalQuiz.findUnique({
      where: { courseId: params.courseId },
      include: { questions: { include: { answers: true } } },
    });

    let finalQuiz;
    if (existingQuiz) {
      // Ștergem întrebările și răspunsurile existente
      await db.quizAnswer.deleteMany({
        where: {
          questionId: {
            in: existingQuiz.questions.map(q => q.id)
          }
        }
      });
      await db.quizQuestion.deleteMany({
        where: {
          finalQuizId: existingQuiz.id
        }
      });

      // Actualizăm quiz-ul existent
      finalQuiz = await db.finalQuiz.update({
        where: { courseId: params.courseId },
        data: {
          minScore: quizData.minScore,
          questions: {
            create: quizData.questions.map(q => ({
              text: q.text,
              answers: {
                create: q.answers.map(a => ({
                  text: a.text,
                  isCorrect: a.isCorrect,
                })),
              },
            })),
          },
        },
        include: {
          questions: {
            include: {
              answers: true
            }
          }
        }
      });
    } else {
      // Creăm un quiz nou
      finalQuiz = await db.finalQuiz.create({
        data: {
          courseId: params.courseId,
          minScore: quizData.minScore,
          questions: {
            create: quizData.questions.map(q => ({
              text: q.text,
              answers: {
                create: q.answers.map(a => ({
                  text: a.text,
                  isCorrect: a.isCorrect,
                })),
              },
            })),
          },
        },
        include: {
          questions: {
            include: {
              answers: true
            }
          }
        }
      });
    }

    return NextResponse.json(finalQuiz);
  } catch (error) {
    console.error('[FINAL_QUIZ_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Găsim quiz-ul existent
    const existingQuiz = await db.finalQuiz.findUnique({
      where: { courseId: params.courseId },
      include: { questions: { include: { answers: true } } },
    });

    if (!existingQuiz) {
      return new NextResponse('Quiz not found', { status: 404 });
    }

    // Ștergem întrebările și răspunsurile asociate
    await db.quizAnswer.deleteMany({
      where: {
        questionId: {
          in: existingQuiz.questions.map(q => q.id)
        }
      }
    });

    await db.quizQuestion.deleteMany({
      where: {
        finalQuizId: existingQuiz.id
      }
    });

    // Ștergem quiz-ul final
    await db.finalQuiz.delete({
      where: { courseId: params.courseId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[FINAL_QUIZ_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 