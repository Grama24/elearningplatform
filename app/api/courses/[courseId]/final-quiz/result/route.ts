import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth();

    console.log("[FINAL_QUIZ_RESULT] userId:", userId);
    console.log("[FINAL_QUIZ_RESULT] params:", params);

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { score, isPassed } = await req.json();
    console.log("[FINAL_QUIZ_RESULT] payload:", { score, isPassed });

    const upsertData = {
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
    };
    console.log("[FINAL_QUIZ_RESULT] upsertData:", upsertData);

    const result = await db.finalQuizResult.upsert(upsertData);

    return NextResponse.json(result);
  } catch (error) {
    console.log("[FINAL_QUIZ_RESULT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 