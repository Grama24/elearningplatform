import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PlusCircle, BookOpen, Users2, GraduationCap } from "lucide-react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const CoursesPage = async () => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  const courses = await db.course.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: true,
      chapters: {
        where: {
          isPublished: true,
        },
      },
      _count: {
        select: {
          purchases: true,
        },
      },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and create new courses
          </p>
        </div>
        <Link href="/teacher/create">
          <Button size="lg" className="flex items-center gap-x-2">
            <PlusCircle className="h-5 w-5" />
            New Course
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-8 w-8 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Courses</p>
              <p className="text-2xl font-bold">{courses.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-x-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users2 className="h-8 w-8 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold">
                {courses.reduce(
                  (acc, course) => acc + course._count.purchases,
                  0
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-purple-500">
          <div className="flex items-center gap-x-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <GraduationCap className="h-8 w-8 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Published Courses</p>
              <p className="text-2xl font-bold">
                {courses.filter((course) => course.isPublished).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Link key={course.id} href={`/teacher/courses/${course.id}`}>
            <Card className="group cursor-pointer transition-all hover:shadow-lg">
              <div className="relative aspect-video rounded-t-lg overflow-hidden">
                {course.isPublished ? (
                  <>
                    <Image
                      fill
                      className="object-cover"
                      alt={course.title}
                      src={course.imageUrl || "/placeholder.jpg"}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                    <p className="text-slate-500 text-sm font-medium">
                      NOT PUBLISHED
                    </p>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit
                </Button>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold line-clamp-1">
                    {course.title}
                  </h3>
                  {course.isPublished ? (
                    <Badge className="bg-green-700">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
                <div className="flex items-center gap-x-2 mt-2">
                  <p className="text-sm text-muted-foreground">
                    {course.chapters.length}{" "}
                    {course.chapters.length === 1 ? "Chapter" : "Chapters"}
                  </p>
                  {course.price !== null && (
                    <>
                      <div className="text-sm text-muted-foreground">•</div>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(course.price)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center p-8 rounded-lg bg-slate-50">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            Nu ai creat niciun curs încă
          </h3>
          <p className="text-gray-500 mt-2 mb-4">
            Începe să creezi primul tău curs pentru a-ți împărtăși cunoștințele.
          </p>
          <Link href="/teacher/create">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Creează primul curs
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
