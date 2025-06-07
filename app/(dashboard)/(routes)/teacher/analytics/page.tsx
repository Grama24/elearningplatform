import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAnalytics } from "@/actions/get-analytics";
import { DataCard } from "./_components/data-card";
import { Chart } from "./_components/chart";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import {
  BookOpen,
  DollarSign,
  Library,
  TrendingUp,
  Users2,
} from "lucide-react";

const AnalyticsPage = async () => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  const { chartData, totalRevenue, totalSales, courseAnalytics, recentSales } =
    await getAnalytics(userId);

  // Get only published courses
  const publishedCourses = courseAnalytics.filter(
    (course) => course.isPublished
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track your course performance and revenue
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <DataCard
          label="Total Revenue"
          value={totalRevenue}
          shouldFormat
          icon={DollarSign}
          className="bg-green-50"
        />
        <DataCard
          label="Total Sales"
          value={totalSales}
          icon={TrendingUp}
          className="bg-blue-50"
        />
      </div>

      {/* Revenue Chart */}
      <div className="space-y-4">
        <div className="flex items-center gap-x-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-medium">Revenue Over Time</h2>
        </div>
        <Chart data={chartData} />
      </div>

      {/* Published Courses Performance */}
      <div className="space-y-4">
        <div className="flex items-center gap-x-2">
          <Library className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-medium">Published Courses Performance</h2>
        </div>
        <div className="rounded-md border">
          <div className="bg-slate-50 p-4">
            <div className="grid grid-cols-3 text-sm font-medium text-slate-500">
              <div>Course Name</div>
              <div className="text-right">Sales</div>
              <div className="text-right">Revenue</div>
            </div>
          </div>
          <div className="divide-y">
            {publishedCourses.map((course) => (
              <div key={course.id} className="p-4">
                <div className="grid grid-cols-3 items-center">
                  <div className="flex items-center gap-x-2">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">{course.title}</span>
                  </div>
                  <div className="text-right font-medium">
                    {course.totalSales} sales
                  </div>
                  <div className="text-right text-green-700 font-medium">
                    {formatPrice(course.totalRevenue)}
                  </div>
                </div>
              </div>
            ))}
            {publishedCourses.length === 0 && (
              <div className="text-center text-sm text-slate-500 p-4">
                No published courses yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="space-y-4">
        <div className="flex items-center gap-x-2">
          <Users2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-medium">Recent Sales</h2>
        </div>
        <Card>
          <div className="p-6">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                No recent sales
              </p>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{sale.course.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatPrice(sale.course.price!)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
