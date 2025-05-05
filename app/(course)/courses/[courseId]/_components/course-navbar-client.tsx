"use client";

import { NavbarRoutes } from "@/components/navbar-routes";
import { Chapter, Course, UserProgress } from "@prisma/client";
import { AutoplayToggle } from "./autoplay-toggle";
import { CourseCompleteButton } from "./course-complete-button";

interface CourseNavbarClientProps {
  mobileMenuSlot: React.ReactNode;
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[];
  };
  progressCount: number;
}

const CourseNavbarClient = ({
  mobileMenuSlot,
  course,
  progressCount,
}: CourseNavbarClientProps) => {
  const allChaptersCompleted =
    course.chapters.length > 0 &&
    course.chapters.every((chapter) => chapter.userProgress?.[0]?.isCompleted);

  return (
    <div className="p-4 border-b h-full flex items-center bg-white shadow-sm">
      {mobileMenuSlot}
      <div className="flex items-center w-full justify-between">
        <div className="flex items-center gap-x-2">
          <AutoplayToggle />
          {progressCount === 100 && (
            <CourseCompleteButton
              courseId={course.id}
              isCompleted={false}
              variant="success"
              size="sm"
            />
          )}
        </div>
        <NavbarRoutes />
      </div>
    </div>
  );
};

export default CourseNavbarClient;
