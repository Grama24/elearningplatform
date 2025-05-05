import Mux from "@mux/mux-node"
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {db} from "@/lib/db"

// Definim un tip pentru răspunsul de la Mux
interface MuxAsset {
  id: string; 
  playback_ids?: Array<{ id: string }>;
}

const { video } = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Adăugăm o funcție de verificare pentru a ne asigura că avem configurațiile necesare
const verifyMuxConfiguration = () => {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    console.error("MUX_TOKEN_ID sau MUX_TOKEN_SECRET lipsesc din configurație");
    return false;
  }
  return true;
}

// Funcție pentru a verifica dacă un URL este valid și public
const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function DELETE(
  req: Request,
  {params} : { params: {courseId: string; chapterId: string}}
) {
  try {
    const { userId } = auth();

    if(!userId) {
      return new NextResponse("Unauthorized", { status: 401});
    }

    const ownCourse = await db.course.findUnique({
      where: {
        id: params.courseId,
        userId,
      }
    });

    if(!ownCourse) {
      return new NextResponse("Unauthorized", { status: 401});
    }


    const chapter = await db.chapter.findUnique({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      }
    });


    if(!chapter) {
      return new NextResponse("Not Found", {status: 404})
    }

    if (chapter.videoUrl) {
      const existingMuxData = await db.muxData.findFirst({
        where: {
          chapterId: params.chapterId,
        }
      });

      if(existingMuxData ){
        await video.assets.delete(existingMuxData.assetId);
        await db.muxData.delete({
          where: {
            id: existingMuxData.id,
          }
        });
      }
    }

      const deletedChapter = await db.chapter.delete({
        where: {
          id: params.chapterId,
        }
      });

       const publishedChaptersInCourse = await db.chapter.findMany({
        where: {
          courseId: params.courseId,
          isPublished: true,
        }
       });

       if(!publishedChaptersInCourse.length) {
        await db.course.update({
          where: {
            id: params.courseId,
          },
          data: {
            isPublished: false,
          }
        })
       }

       return NextResponse.json(deletedChapter);

  } catch (error) {
    console.log("[CHAPTER_ID_DELETE]", error);
    return new NextResponse("Internal Error", {status:500})
  }
}

export async function PATCH (
  req: Request,
  {params} : { params: {courseId: string; chapterId: string}}
) {
  try{
    // Verificăm configurația Mux înainte de a procesa cererile
    if (!verifyMuxConfiguration()) {
      return new NextResponse("Mux configuration is missing", {status: 500});
    }

    const {userId} = auth();
    const {isPublished, ...values} = await req.json();

      if(!userId) {
        return new NextResponse("Unauthorized",{ status: 401})
      }

      const ownCourse = await db.course.findUnique({
        where:{
          id: params.courseId,
          userId
        }
      });

      if(!ownCourse) {
        return new NextResponse("Unauthorized",{ status: 401})
      }

      // Actualizăm întâi capitolul - important pentru a nu pierde datele chiar dacă Mux eșuează
      const chapter = await db.chapter.update({
        where:{
          id: params.chapterId,
          courseId: params.courseId,
        },
        data: {
          ...values,
        }
      });

      // Procesăm video-ul dacă există
      if (values.videoUrl) {
        // Validăm URL-ul
        if (!isValidURL(values.videoUrl)) {
          console.error(`[MUX_ERROR] URL invalid: ${values.videoUrl}`);
          return NextResponse.json(chapter);
        }

        console.log(`[VIDEO_UPLOAD] Procesare video URL: ${values.videoUrl}`);

        // Verificăm dacă există deja o înregistrare în MuxData pentru acest capitol
        const existingMuxData = await db.muxData.findUnique({
          where: {
            chapterId: params.chapterId,
          }
        });

        // Ștergem datele anterioare Mux dacă există
        if(existingMuxData){
          try {
            await video.assets.delete(existingMuxData.assetId);
            // Nu ștergem înregistrarea din baza de date, o vom actualiza mai târziu
          } catch (deleteError) {
            console.error("[MUX_DELETE_ERROR]", deleteError);
            // Continuăm, poate asset-ul nu mai există
          }
        }

        try {
          console.log("[MUX] Încercare de creare asset cu URL:", values.videoUrl);
          
          // Creăm asset-ul Mux
          const createAssetPromise = video.assets.create({
            input: values.videoUrl,
            playback_policy: ['public'],
            test: false,
          }) as Promise<MuxAsset>;
          
          // Setăm un timeout
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout la crearea asset-ului Mux")), 30000)
          );
          
          // Așteptăm oricare dintre promisiuni să se rezolve prima
          const asset = await Promise.race([createAssetPromise, timeoutPromise]);

          console.log("[MUX] Asset creat cu succes:", asset.id);
          
          if (!asset || !asset.id || !asset.playback_ids || asset.playback_ids.length === 0) {
            throw new Error("Asset sau playback_id lipsă din răspunsul Mux");
          }

          // Salvăm sau actualizăm datele Mux
          const muxData = {
            assetId: asset.id,
            playbackId: asset.playback_ids[0]?.id,
          };

          if (existingMuxData) {
            // Dacă există deja o înregistrare, o actualizăm
            console.log(`[MUX] Actualizare MuxData pentru capitolul ${params.chapterId}`);
            await db.muxData.update({
              where: {
                id: existingMuxData.id,
              },
              data: muxData
            });
          } else {
            // Altfel, creăm una nouă
            console.log(`[MUX] Creare MuxData pentru capitolul ${params.chapterId}`);
            await db.muxData.create({
              data: {
                chapterId: params.chapterId,
                ...muxData
              }
            });
          }

          console.log(`[MUX] Date salvate în baza de date pentru capitolul ${params.chapterId}`);
        } catch (muxError) {
          console.error("[MUX_ERROR]", muxError);
          // Nu aruncăm eroarea mai departe pentru a permite actualizarea capitolului
          // chiar dacă încărcarea video eșuează
        }
      }

      return NextResponse.json(chapter);

  } catch (error) {
      console.log("[COURSES_CHAPTER_ID]", error);
      return new NextResponse("Internal Error", {status: 500})
  }
}