import { db } from "@/lib/db";
import { Course, Purchase } from "@prisma/client";

type PurchaseWithCourse = Purchase & {
  course: Course;
};

interface CourseAnalytics {
  id: string;
  title: string;
  totalRevenue: number;
  totalSales: number;
  isPublished: boolean;
  averageRating?: number;
}

const groupByCourse = (purchases: PurchaseWithCourse[], allCourses: Course[]): CourseAnalytics[] => {
  const grouped = new Map<string, CourseAnalytics>();

  // Initialize with all courses
  allCourses.forEach((course) => {
    grouped.set(course.id, {
      id: course.id,
      title: course.title,
      totalRevenue: 0,
      totalSales: 0,
      isPublished: course.isPublished,
    });
  });

  // Add purchase data
  purchases.forEach((purchase) => {
    const { course } = purchase;
    const courseStats = grouped.get(course.id)!;
    courseStats.totalRevenue += course.price!;
    courseStats.totalSales += 1;
  });

  return Array.from(grouped.values());
};

const getDemoChartData = () => {
  const currentYear = new Date().getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate random values between 2000 and 8000 for months until June
  const monthlyData = months.map((month, index) => {
    const isBeforeJuly = index <= 5; // 5 is June (0-based index)
    const total = isBeforeJuly ? Math.floor(Math.random() * 6000) + 2000 : 0;
    return {
      name: `${month} ${currentYear}`,
      total
    };
  });

  return monthlyData;
};

export const getAnalytics = async (userId: string) => {
  try {
    // Get all courses first
    const courses = await db.course.findMany({
      where: {
        userId: userId,
      },
    });

    // Get all purchases
    const purchases = await db.purchase.findMany({
      where: {
        course: {
          userId: userId
        }
      },
      include: {
        course: true,
      }
    });

    const courseAnalytics = groupByCourse(purchases, courses);
    
    // Get demo chart data
    const chartData = getDemoChartData();

    const totalRevenue = courseAnalytics.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    const totalSales = courseAnalytics.reduce((acc, curr) => acc + curr.totalSales, 0);

    // Get recent sales
    const recentSales = await db.purchase.findMany({
      where: {
        course: {
          userId: userId
        }
      },
      include: {
        course: true,
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    return {
      courseAnalytics,
      chartData,
      totalRevenue,
      totalSales,
      recentSales,
    }

  } catch (error) {
    console.log("[GET_ANALYTICS]", error);
    return {
      courseAnalytics: [],
      chartData: [],
      totalRevenue: 0,
      totalSales: 0,
      recentSales: [],
    }
  }
};