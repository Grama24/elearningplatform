import { getDashboardCourses } from "@/actions/get-dashboard-courses";
import { CoursesList } from "@/components/courses-list";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CheckCircle, Clock, Rocket } from "lucide-react";
import { redirect } from "next/navigation";
import { InfoCard } from "./_components/info-card";

export default async function Dashboard() {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId) {
    return redirect("/");
  }

  const { completedCourses, coursesInProgress } = await getDashboardCourses(
    userId
  );
  const totalCourses = completedCourses.length + coursesInProgress.length;

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-y-2">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back{" "}
          <span className="font-serif italic text-yellow-600">
            {user?.firstName || "Student"}
          </span>
          !
        </h1>
        <p className="text-gray-600">
          Here's an overview of your learning progress
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCard
          icon={Clock}
          label="In Progress"
          numberOfItems={coursesInProgress.length}
        />
        <InfoCard
          icon={CheckCircle}
          label="Completed"
          numberOfItems={completedCourses.length}
          variant="success"
        />
        <InfoCard
          icon={Rocket}
          label="Total Courses"
          numberOfItems={totalCourses}
          variant="default"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Your Courses</h2>
        <CoursesList items={[...coursesInProgress, ...completedCourses]} />
      </div>
    </div>
  );
}
