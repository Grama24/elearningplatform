import Image from "next/image";
import Link from "next/link";
import { IconBadge } from "@/components/icon-badge";
import { BookOpen } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { CourseProgress } from "./course-progress";

interface CourseCardProps {
  id: string;
  title: string;
  imageUrl: string;
  chaptersLength: number;
  price: number;
  progress: number | null;
  category: string;
}

export const CourseCard = ({
  id,
  title,
  imageUrl,
  chaptersLength,
  price,
  progress,
  category,
}: CourseCardProps) => {
  return (
    <Link href={`/courses/${id}`}>
      <div className="group h-full relative bg-white border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-100 flex flex-col">
        {/* Imagine și overlay */}
        <div className="relative w-full aspect-[4/3]">
          <Image
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            alt={title}
            src={imageUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Badge categorie */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-white/95 rounded-full text-xs font-medium text-gray-700 shadow-sm">
              {category}
            </span>
          </div>

          {/* Preț */}
          {!progress && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-blue-500/95 text-white rounded-full text-xs font-medium shadow-sm">
                {formatPrice(price)}
              </span>
            </div>
          )}
        </div>

        {/* Conținut */}
        <div className="flex flex-col flex-grow p-4">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>

          <div className="mt-auto">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <IconBadge size="sm" icon={BookOpen} />
              <span>
                {chaptersLength} {chaptersLength === 1 ? "Chapter" : "Chapters"}
              </span>
            </div>

            {/* Bară de progres */}
            {progress !== null && (
              <div className="mt-4">
                <CourseProgress
                  size="sm"
                  variant={progress === 100 ? "success" : "default"}
                  value={progress}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
