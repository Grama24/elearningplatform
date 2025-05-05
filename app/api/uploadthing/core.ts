import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";
import { isTeacher } from "@/lib/teacher";

const f = createUploadthing();

const handleAuth = () => {
  const { userId } = auth();

  const isAuthorized = isTeacher(userId);

  if (!userId || !isAuthorized) throw new Error("Unauthorized");
  return { userId };
}


export const ourFileRouter = {
  courseImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => {
      console.log("[UPLOADTHING] Începe upload imagine curs");
      return handleAuth();
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("[UPLOADTHING] Upload imagine curs finalizat:", file.url);
    }),
  courseAttachment: f(["text", "image", "video", "audio", "pdf"])
    .middleware(() => {
      console.log("[UPLOADTHING] Începe upload atașament curs");
      return handleAuth();
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("[UPLOADTHING] Upload atașament curs finalizat:", file.url);
    }),
  chapterVideo: f({ video: { maxFileCount: 1, maxFileSize: "512GB" } })
    .middleware(() => {
      console.log("[UPLOADTHING] Începe upload video capitol");
      return handleAuth();
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("[UPLOADTHING] Upload video capitol finalizat:", file.url);
      console.log("[UPLOADTHING] Detalii fișier:", {
        name: file.name,
        size: file.size,
        key: file.key,
        url: file.url
      });
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;