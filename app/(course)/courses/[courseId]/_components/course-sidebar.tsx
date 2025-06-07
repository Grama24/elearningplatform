import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Chapter, Course, UserProgress } from "@prisma/client";
import { redirect } from "next/navigation";
import CourseSideBarClient from "./course-sidebar-client";

interface CourseSideBarProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[];
    finalQuiz?: any;
  };
  progressCount: number;
}

const CourseSideBar = async ({ course, progressCount }: CourseSideBarProps) => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  console.log("DEBUG SIDEBAR SERVER - RAW COURSE:", {
    courseId: course.id,
    hasFinalQuiz: !!course.finalQuiz,
    finalQuiz: course.finalQuiz,
    courseKeys: Object.keys(course),
  });

  const purchase = await db.purchase.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
  });

  const isPurchased = !!purchase;

  const serializedCourse = {
    ...course,
    finalQuiz: course.finalQuiz
      ? {
          id: course.finalQuiz.id,
          courseId: course.finalQuiz.courseId,
          minScore: course.finalQuiz.minScore,
          createdAt: course.finalQuiz.createdAt,
          updatedAt: course.finalQuiz.updatedAt,
          questions: course.finalQuiz.questions?.map((question) => ({
            id: question.id,
            text: question.text,
            answers: question.answers?.map((answer) => ({
              id: answer.id,
              text: answer.text,
              isCorrect: answer.isCorrect,
            })),
          })),
        }
      : null,
  };

  console.log("DEBUG SIDEBAR SERVER - SERIALIZED:", {
    hasFinalQuiz: !!serializedCourse.finalQuiz,
    finalQuiz: serializedCourse.finalQuiz,
    courseKeys: Object.keys(serializedCourse),
  });

  return (
    <CourseSideBarClient
      course={serializedCourse}
      progressCount={progressCount}
      isPurchased={isPurchased}
      finalQuiz={serializedCourse.finalQuiz}
    />
  );
};

export default CourseSideBar;
