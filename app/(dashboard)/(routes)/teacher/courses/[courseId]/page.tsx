import { IconBadge } from "@/components/icon-badge";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import {
  CircleDollarSign,
  File,
  LayoutDashboard,
  ListChecks,
  BookOpen,
  ImageIcon,
  Settings,
  Paintbrush,
  Library,
  Wrench,
} from "lucide-react";
import { redirect } from "next/navigation";
import { TitleForm } from "./_components/title-form";
import { DescriptionForm } from "./_components/description-form";
import { ImageForm } from "./_components/image-form";
import { CategoryForm } from "./_components/category-form";
import { PriceForm } from "./_components/price-form";
import { AttachmentForm } from "./_components/attachment-form";
import { ChaptersForm } from "./_components/chapters-form";
import { Banner } from "@/components/banner";
import { Actions } from "./_components/actions";
import { FinalQuizForm } from "./_components/final-quiz-form";
import { FinalQuizDisplay } from "./_components/final-quiz-display";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CourseIdPage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
      userId,
    },
    include: {
      chapters: {
        orderBy: {
          position: "asc",
        },
      },
      attachments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const categories = await db.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  if (!course) {
    return redirect("/");
  }

  const requiredFields = [
    course.title,
    course.description,
    course.imageUrl,
    course.price,
    course.categoryId,
    course.chapters.some((chapter) => chapter.isPublished),
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;
  const completionPercentage = (completedFields / totalFields) * 100;

  const isComplete = requiredFields.every(Boolean);

  const sections = [
    {
      title: "Customize Course",
      icon: Paintbrush,
      bgColor: "blue",
      items: [
        {
          title: "Title & Description",
          description: "Set your course's name and overview",
          forms: [
            <TitleForm key="title" initialData={course} courseId={course.id} />,
            <DescriptionForm
              key="desc"
              initialData={course}
              courseId={course.id}
            />,
          ],
        },
        {
          title: "Image & Category",
          description: "Add a thumbnail and select category",
          forms: [
            <ImageForm key="image" initialData={course} courseId={course.id} />,
            <CategoryForm
              key="category"
              initialData={course}
              courseId={course.id}
              options={categories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
            />,
          ],
        },
      ],
    },
    {
      title: "Course Content",
      icon: Library,
      bgColor: "amber",
      items: [
        {
          title: "Chapters",
          description: "Create and organize your course chapters",
          forms: [
            <ChaptersForm
              key="chapters"
              initialData={course}
              courseId={course.id}
            />,
          ],
        },
        {
          title: "Final Quiz",
          description: "Create and manage the final assessment",
          forms: [
            <FinalQuizForm key="quiz" courseId={course.id} />,
            <FinalQuizDisplay key="quiz-display" courseId={course.id} />,
          ],
        },
      ],
    },
    {
      title: "Settings & Resources",
      icon: Wrench,
      bgColor: "violet",
      items: [
        {
          title: "Pricing",
          description: "Set your course price",
          forms: [
            <PriceForm key="price" initialData={course} courseId={course.id} />,
          ],
        },
        {
          title: "Attachments",
          description: "Add supplementary materials",
          forms: [
            <AttachmentForm
              key="attachments"
              initialData={course}
              courseId={course.id}
            />,
          ],
        },
      ],
    },
  ];

  return (
    <>
      {!course.isPublished && (
        <Banner
          variant="warning"
          label="This course is unpublished. It will not be visible to students."
        />
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-2">
            <h1 className="text-3xl font-bold">Course Setup</h1>
            <div className="flex items-center gap-x-2">
              <Progress value={completionPercentage} className="w-[200px]" />
              <span className="text-sm text-muted-foreground">
                {completedFields}/{totalFields} fields completed
              </span>
            </div>
          </div>
          <Actions
            disabled={!isComplete}
            courseId={params.courseId}
            isPublished={course.isPublished}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 mt-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-6">
              <div className="flex items-center gap-x-2">
                <IconBadge icon={section.icon} />
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.items.map((item) => (
                  <Card
                    key={item.title}
                    className={cn(
                      "p-4 border-l-4",
                      section.bgColor === "blue" &&
                        "border-l-blue-500 bg-blue-50/50",
                      section.bgColor === "amber" &&
                        "border-l-amber-500 bg-amber-50/50",
                      section.bgColor === "violet" &&
                        "border-l-violet-500 bg-violet-50/50"
                    )}
                  >
                    <div className="flex flex-col gap-y-2 mb-4">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div className="space-y-4">{item.forms}</div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CourseIdPage;
