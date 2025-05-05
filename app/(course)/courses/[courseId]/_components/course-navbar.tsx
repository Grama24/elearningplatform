import { Chapter, Course, UserProgress } from "@prisma/client";
import { CourseMobileSidebar } from "./course-mobile-sidebar";
import CourseNavbarClient from "./course-navbar-client";

interface CourseNavbarProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[];
  };
  progressCount: number;
}

const CourseNavbar = async ({ course, progressCount }: CourseNavbarProps) => {
  return (
    <CourseNavbarClient
      course={course}
      progressCount={progressCount}
      mobileMenuSlot={
        <CourseMobileSidebar course={course} progressCount={progressCount} />
      }
    />
  );
};

export default CourseNavbar;
