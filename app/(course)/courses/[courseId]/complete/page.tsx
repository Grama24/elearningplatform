import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CourseCertificate } from "@/components/course-certificate";
import { ConfettiProvider } from "@/components/providers/confetti-provider";
import { File, Trophy } from "lucide-react";
import Link from "next/link";
import { BlockchainService } from "@/lib/blockchain";
import ClientConfetti from "./client-confetti";

const CourseCompletePage = async ({
  params,
}: {
  params: { courseId: string };
}) => {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) {
    return redirect("/");
  }

  // Verificăm dacă cursul există
  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
      isPublished: true,
    },
  });

  if (!course) {
    return redirect("/");
  }

  // Verificăm dacă utilizatorul a achiziționat cursul
  const purchase = await db.purchase.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: params.courseId,
      },
    },
  });

  if (!purchase) {
    return redirect(`/courses/${params.courseId}`);
  }

  // Verificăm dacă toate capitolele sunt complete
  const chapters = await db.chapter.findMany({
    where: {
      courseId: params.courseId,
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
  });

  const allCompleted = chapters.every(
    (chapter) => chapter.userProgress?.[0]?.isCompleted
  );

  if (!allCompleted) {
    return redirect(`/courses/${params.courseId}`);
  }

  // Verifică existența certificatului - mai întâi în blockchain
  let existingCertificate = null;
  try {
    const blockchainService = new BlockchainService();
    existingCertificate = await blockchainService.getCertificate(
      params.courseId,
      userId
    );
  } catch (error) {
    console.error("Error checking for certificate in blockchain:", error);
  }

  // Dacă nu s-a găsit în blockchain, verificăm în baza de date locală
  if (!existingCertificate?.exists) {
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
        existingCertificate = {
          exists: true,
          courseId: params.courseId,
          userId,
          timestamp: localCertificate.issuedAt,
        };
      }
    } catch (error) {
      console.error("Error checking for certificate in local database:", error);
    }
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 pb-10">
      <ConfettiProvider />
      <ClientConfetti />

      <div className="flex flex-col items-center justify-center max-w-2xl">
        <div className="bg-yellow-200 p-3 rounded-full mb-8">
          <Trophy className="h-12 w-12 text-yellow-600" />
        </div>
        <h1 className="text-3xl font-bold mb-6">
          Felicitări, {fullName || "Utilizator"}!
        </h1>
        <p className="text-xl mb-8">
          Ai finalizat cu succes cursul{" "}
          <span className="font-bold">{course.title}</span>
        </p>

        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {existingCertificate?.exists ? (
            <Link
              href={`/certificates?highlight=${params.courseId}`}
              className="w-full"
            >
              <Button size="lg" variant="outline" className="w-full">
                <File className="h-4 w-4 mr-2" />
                Vezi Certificatul
              </Button>
            </Link>
          ) : (
            <CourseCertificate
              courseId={course.id}
              userId={userId}
              courseName={course.title}
            />
          )}

          <Link href={`/courses/${params.courseId}`}>
            <Button variant="outline">Înapoi la curs</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCompletePage;
