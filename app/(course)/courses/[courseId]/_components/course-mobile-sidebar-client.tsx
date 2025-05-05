"use client";

import { Menu } from "lucide-react";
import { Chapter, Course, UserProgress } from "@prisma/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CourseSideBarClient from "./course-sidebar-client";

interface CourseMobileSidebarClientProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[];
  };
  progressCount: number;
  isPurchased: boolean;
}

export const CourseMobileSidebarClient = ({
  course,
  progressCount,
  isPurchased,
}: CourseMobileSidebarClientProps) => {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden pr-4 hover:opacity-75 transition">
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-white w-72">
        <CourseSideBarClient
          course={course}
          progressCount={progressCount}
          isPurchased={isPurchased}
        />
      </SheetContent>
    </Sheet>
  );
};
