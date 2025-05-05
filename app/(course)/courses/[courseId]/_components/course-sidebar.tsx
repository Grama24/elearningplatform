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
  };
  progressCount: number;
}

const CourseSideBar = async ({ course, progressCount }: CourseSideBarProps) => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  const purchase = await db.purchase.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
  });

  const isPurchased = !!purchase;

  return (
    <CourseSideBarClient
      course={course}
      progressCount={progressCount}
      isPurchased={isPurchased}
    />
  );
};

export default CourseSideBar;
