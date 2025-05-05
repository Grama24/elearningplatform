import Mux from "@mux/mux-node"

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/teacher";
import { clerkClient } from "@clerk/nextjs/server";

const { video } = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Funcție pentru a obține detaliile utilizatorului de la Clerk
const getTeacherInfo = async (userId: string) => {
  try {
    const user = await clerkClient.users.getUser(userId);
    return {
      id: userId,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Profesor",
      imageUrl: user.imageUrl || "",
    };
  } catch (error) {
    console.error("Error fetching teacher info:", error);
    return {
      id: userId,
      name: "Profesor",
      imageUrl: "",
    };
  }
};

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    // Nu este necesară autentificarea pentru a obține detalii publice ale cursului
    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        isPublished: true,
      },
      include: {
        category: true,
      },
    });

    if (!course) {
      return new NextResponse("Curs negăsit sau nepublicat", { status: 404 });
    }

    // Obținem informații despre profesor
    const teacherInfo = await getTeacherInfo(course.userId);

    // Combinăm datele cursului cu informațiile despre profesor
    const courseWithTeacher = {
      ...course,
      teacher: teacherInfo
    };

    return NextResponse.json(courseWithTeacher);
  } catch (error) {
    console.error("[COURSE_GET]", error);
    return new NextResponse("Eroare internă", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId || !isTeacher(userId)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        userId: userId,
      },
      include: {
        chapters: {
          include: {
            muxData: true,
          }
        }
      }
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    for (const chapter of course.chapters) {
      if (chapter.muxData?.assetId) {
        await video.assets.delete(chapter.muxData.assetId);
      }
    }

    const deletedCourse = await db.course.delete({
      where: {
        id: params.courseId,
      },
    })

    return NextResponse.json(deletedCourse);

  } catch (error) {
    console.log("[COURSE_ID_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth();
    const { courseId } = params;
    const values = await req.json();

    if (!userId || !isTeacher(userId)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.update({
      where: {
        id: courseId,
        userId
      },
      data: {
        ...values,
      }
    });

    return NextResponse.json(course);

  } catch (error) {
    console.log("[COURSE_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}