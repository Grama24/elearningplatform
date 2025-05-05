import { getChapter } from "@/actions/get-chapter";
import { Banner } from "@/components/banner";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VideoPlayer } from "./_components/video-player";
import CourseEnrollButton from "./_components/course-enroll-button";
import { Separator } from "@/components/ui/separator";
import { Preview } from "@/components/preview";
import { File } from "lucide-react";
import { CourseProgressButton } from "./_components/course-progress-button";
import { db } from "@/lib/db";
import {
  Chapter,
  Course,
  UserProgress,
  MuxData,
  Attachment,
} from "@prisma/client";
import { getProgress } from "@/actions/get-progress";

interface ChapterWithProgress extends Chapter {
  userProgress: UserProgress[];
  muxData: MuxData | null;
}

interface CourseWithChapters extends Course {
  chapters: ChapterWithProgress[];
  attachments: Attachment[];
}

const ChapterIdPage = async ({
  params,
}: {
  params: { courseId: string; chapterId: string };
}) => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  const course = (await db.course.findUnique({
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
          muxData: true,
        },
        orderBy: {
          position: "asc",
        },
      },
      attachments: true,
    },
  })) as CourseWithChapters | null;

  if (!course) {
    return redirect("/");
  }

  const chapter = course.chapters.find(
    (chapter) => chapter.id === params.chapterId
  );

  if (!chapter) {
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

  const userProgress = await db.userProgress.findUnique({
    where: {
      userId_chapterId: {
        userId,
        chapterId: params.chapterId,
      },
    },
  });

  const nextChapter = course.chapters.find(
    (chapter) => chapter.position > chapter.position
  );

  const isLastChapter = !nextChapter;
  const isLocked = !chapter.isFree && !purchase;
  const completeOnEnd = !!purchase && !userProgress?.isCompleted;

  const progressCount = await getProgress(userId, course.id);

  // Verificăm dacă avem datele Mux și afișăm un mesaj dacă acestea lipsesc
  const isMuxDataMissing = !isLocked && !chapter.muxData?.playbackId;

  return (
    <div>
      {userProgress?.isCompleted && (
        <Banner label="You already completed this chapter." variant="success" />
      )}
      {isLocked && (
        <Banner
          label="You need to purchase this course to watch this chapter."
          variant="warning"
        />
      )}
      {isMuxDataMissing && (
        <Banner
          label="Video processing in progress. Please check back later."
          variant="warning"
        />
      )}
      <div className="flex flex-col max-w-4xl mx-auto pb-20">
        <div className="p-4">
          {!isMuxDataMissing ? (
            <VideoPlayer
              chapterId={params.chapterId}
              title={chapter.title}
              courseId={params.courseId}
              nextChapterId={nextChapter?.id}
              playbackId={chapter.muxData?.playbackId || ""}
              isLocked={isLocked}
              completeOnEnd={completeOnEnd}
            />
          ) : (
            <div className="relative aspect-video flex items-center justify-center bg-slate-800">
              <div className="text-white text-center p-5">
                <h3 className="text-xl font-semibold">Video Processing</h3>
                <p className="mt-2">
                  The video for this chapter is still being processed. This may
                  take a few minutes to complete.
                </p>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="p-4 flex flex-col md:flex-row items-center justify-between">
            <h2 className="text-2xl font-semibold mb-2">{chapter.title}</h2>
            {purchase ? (
              <CourseProgressButton
                chapterId={params.chapterId}
                courseId={params.courseId}
                nextChapterId={nextChapter?.id}
                isCompleted={!!userProgress?.isCompleted}
                isLastChapter={isLastChapter}
                courseProgress={progressCount}
              />
            ) : (
              <CourseEnrollButton
                courseId={params.courseId}
                price={course.price!}
              />
            )}
          </div>
          <Separator />
          <div>
            <Preview value={chapter.description!} />
          </div>
          {!!course.attachments.length && (
            <>
              <Separator />
              <div className="p-4">
                {course.attachments.map((attachment) => (
                  <a
                    href={attachment.url}
                    key={attachment.id}
                    className="flex items-center p-3 w-full bg-sky-200 border text-sky-700 rounded-md hover:underline"
                    target="_blank"
                  >
                    <File />
                    <p className="line-clamp-1">{attachment.name}</p>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterIdPage;
