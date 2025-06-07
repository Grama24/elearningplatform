"use client";

import { Chapter, Course, UserProgress } from "@prisma/client";
import CourseSidebarItem from "./course-sidebar-item";
import { CourseProgress } from "@/components/course-progress";
import { useRouter } from "next/navigation";

interface CourseSideBarClientProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[];
  };
  progressCount: number;
  isPurchased: boolean;
  finalQuiz?: any;
}

const CourseSideBarClient = ({
  course,
  progressCount,
  isPurchased,
  finalQuiz,
}: CourseSideBarClientProps) => {
  const router = useRouter();

  const allChaptersCompleted = course.chapters.every(
    (chapter) => chapter.userProgress?.[0]?.isCompleted
  );

  const hasFinalQuiz = finalQuiz || course.finalQuiz;

  console.log("DEBUG SIDEBAR:", {
    allChaptersCompleted,
    hasFinalQuiz,
    finalQuiz,
    courseFinalQuiz: course.finalQuiz,
    chapters: course.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      isCompleted: ch.userProgress?.[0]?.isCompleted,
    })),
  });

  const handleQuizClick = () => {
    if (allChaptersCompleted) {
      router.push(`/courses/${course.id}/final-quiz`);
    }
  };

  return (
    <div className="h-full border-r flex flex-col overflow-y-auto shadow-sm">
      <div className="p-8 flex flex-col border-b">
        <h1 className="font-semibold">{course.title}</h1>
        {isPurchased && (
          <div className="mt-10">
            <CourseProgress variant="success" value={progressCount} />
          </div>
        )}
      </div>
      <div className="flex flex-col w-full">
        {course.chapters.map((chapter) => (
          <CourseSidebarItem
            key={chapter.id}
            id={chapter.id}
            label={chapter.title}
            isCompleted={!!chapter.userProgress?.[0]?.isCompleted}
            courseId={course.id}
            isLocked={!chapter.isFree && !isPurchased}
          />
        ))}
        {hasFinalQuiz && allChaptersCompleted && (
          <CourseSidebarItem
            key="final-quiz"
            id="final-quiz"
            label="Quiz Final"
            isCompleted={false}
            courseId={course.id}
            isLocked={false}
            onClick={handleQuizClick}
          />
        )}
      </div>
    </div>
  );
};

export default CourseSideBarClient;
