import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FinalQuiz } from "./_components/final-quiz";

const FinalQuizPage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
      isPublished: true,
    },
    include: {
      chapters: {
        where: {
          isPublished: true,
        },
        include: {
          userProgress: {
            where: {
              userId,
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
      finalQuiz: {
        include: {
          questions: {
            include: {
              answers: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    return redirect("/");
  }

  // Verificăm dacă toate capitolele sunt completate
  const allChaptersCompleted = course.chapters.every(
    (chapter) => chapter.userProgress?.[0]?.isCompleted
  );

  if (!allChaptersCompleted) {
    return redirect(`/courses/${course.id}`);
  }

  return (
    <div className="h-full">
      <div className="md:pl-80 pt-[80px] h-full">
        <div className="max-w-4xl mx-auto p-6">
          <FinalQuiz courseId={course.id} quiz={course.finalQuiz} />
        </div>
      </div>
    </div>
  );
};

export default FinalQuizPage;
