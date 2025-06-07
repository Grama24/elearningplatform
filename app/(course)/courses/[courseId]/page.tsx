import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProgress } from "@/actions/get-progress";
import CourseSideBar from "./_components/course-sidebar";
import CourseNavbar from "./_components/course-navbar";
import { CourseCertificate } from "@/components/course-certificate";
import { CourseProgress } from "@/components/course-progress";
import CourseEnrollButton from "./chapters/[chapterId]/_components/course-enroll-button";
import { Preview } from "@/components/preview";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Clock, FileText, PlayCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { CourseCompletionHandler } from "./_components/course-completion-handler";
import { CertificateModal } from "@/components/certificate-modal";
import { ConfettiProvider } from "@/components/providers/confetti-provider";
import { CourseSuccessHandler } from "./_components/course-success-handler";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CourseCompleteButton } from "./_components/course-complete-button";
import { BlockchainService } from "@/lib/blockchain";

const CourseIdPage = async ({
  params,
  searchParams,
}: {
  params: { courseId: string };
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId } = auth();

  // Verificăm dacă este un success=1 în URL pentru a verifica achiziția
  const isSuccess = searchParams.success === "1";

  if (!userId) {
    return redirect("/");
  }

  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
      isPublished: true,
    },
    include: {
      chapters: {
        where: {
          isPublished: true,
        },
        include: {
          userProgress: {
            where: {
              userId,
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
      category: true,
      finalQuiz: {
        include: {
          questions: {
            include: {
              answers: true,
            },
          },
        },
      },
    },
  });

  // Verificăm direct quiz-ul
  const quiz = await db.finalQuiz.findUnique({
    where: {
      courseId: params.courseId,
    },
    include: {
      questions: {
        include: {
          answers: true,
        },
      },
    },
  });

  console.log("DEBUG PAGE - QUIZ:", {
    quiz,
    hasQuiz: !!quiz,
  });

  console.log("DEBUG PAGE - COURSE:", {
    courseId: params.courseId,
    hasFinalQuiz: !!course?.finalQuiz,
    finalQuiz: course?.finalQuiz,
    courseKeys: course ? Object.keys(course) : [],
    chapters: course?.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      isCompleted: ch.userProgress?.[0]?.isCompleted,
    })),
  });

  if (!course) {
    return redirect("/");
  }

  const purchase = await db.purchase.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: params.courseId,
      },
    },
  });

  const progressCount = await getProgress(userId, course.id);

  // Găsim primul capitol neterminat
  const firstUnfinishedChapter = course.chapters.find(
    (chapter) =>
      !chapter.userProgress?.[0] ||
      chapter.userProgress[0].isCompleted === false
  );

  // Verificăm dacă certificatul există
  let hasCertificate = false;
  if (progressCount === 100) {
    // Verificăm mai întâi în blockchain
    try {
      const blockchainService = new BlockchainService();
      const certificate = await blockchainService.getCertificate(
        params.courseId,
        userId
      );

      if (certificate?.exists) {
        hasCertificate = true;
      }
    } catch (error) {
      console.error("Error checking blockchain certificate:", error);
    }

    // Dacă nu găsim în blockchain, verificăm în baza de date locală
    if (!hasCertificate) {
      try {
        const localCertificate = await db.certificate.findUnique({
          where: {
            courseId_userId: {
              courseId: params.courseId,
              userId,
            },
          },
        });

        if (localCertificate) {
          hasCertificate = true;
        }
      } catch (error) {
        console.error("Error checking local certificate:", error);
      }
    }
  }

  // Verificăm dacă există quiz final și dacă studentul l-a trecut
  let hasPassedFinalQuiz = true;
  if (course.finalQuiz) {
    const quizResult = await db.finalQuizResult.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: params.courseId,
        },
      },
    });
    hasPassedFinalQuiz = !!quizResult?.isPassed;
  }

  // Adăugăm quiz-ul la curs dacă există
  const courseWithQuiz = {
    ...course,
    finalQuiz: quiz,
  };

  console.log("DEBUG PAGE - FINAL:", {
    hasFinalQuiz: !!courseWithQuiz.finalQuiz,
    finalQuiz: courseWithQuiz.finalQuiz,
  });

  return (
    <div className="h-full">
      {isSuccess && !purchase && <CourseSuccessHandler courseId={course.id} />}
      <CourseCompletionHandler
        courseId={course.id}
        progressPercentage={progressCount}
      />
      <CertificateModal />
      <ConfettiProvider />
      <main className="md:pl-80 pt-[80px] h-full">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6">
              {course.imageUrl && (
                <div className="flex-shrink-0 md:w-1/3">
                  <Image
                    src={course.imageUrl}
                    alt={course.title}
                    width={300}
                    height={200}
                    className="rounded-md object-cover w-full"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 md:w-2/3">
                <h1 className="text-3xl font-bold">{course.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.chapters.length} capitole</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Dificultate: {course.category?.name || "Medie"}</span>
                  </div>
                  {!purchase && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{formatPrice(course.price!)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Despre curs</h2>
              <Preview value={course.description!} />
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Progresul tău</h2>
              {!purchase ? (
                <div className="flex flex-col gap-4">
                  <p className="text-muted-foreground">
                    Înscrie-te în curs pentru a începe să înveți!
                  </p>
                  <CourseEnrollButton
                    courseId={params.courseId}
                    price={course.price!}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <CourseProgress variant="success" value={progressCount} />

                  {progressCount === 100 && hasPassedFinalQuiz && (
                    <div className="flex flex-col gap-4">
                      <CourseCompleteButton
                        courseId={course.id}
                        isCompleted={hasCertificate}
                      />
                    </div>
                  )}

                  {!hasCertificate && firstUnfinishedChapter && (
                    <Link
                      href={`/courses/${course.id}/chapters/${firstUnfinishedChapter.id}`}
                    >
                      <Button className="w-full md:w-auto mt-4" size="lg">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Continuă cursul
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <CourseSideBar course={courseWithQuiz} progressCount={progressCount} />
    </div>
  );
};

export default CourseIdPage;
