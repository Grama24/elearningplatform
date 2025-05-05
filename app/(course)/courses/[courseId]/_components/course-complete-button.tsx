"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, File } from "lucide-react";
import Link from "next/link";

interface CourseCompleteButtonProps {
  courseId: string;
  isCompleted: boolean;
  variant?: "default" | "success" | "outline";
  size?: "default" | "sm" | "lg";
}

export const CourseCompleteButton = ({
  courseId,
  isCompleted,
  variant = "default",
  size = "default",
}: CourseCompleteButtonProps) => {
  if (isCompleted) {
    return (
      <Link href={`/certificates?highlight=${courseId}`}>
        <Button variant="outline" size={size} className="text-emerald-600">
          <File className="h-4 w-4 mr-2" />
          Vezi certificatul
        </Button>
      </Link>
    );
  }

  return (
    <Link href={`/courses/${courseId}/complete`}>
      <Button variant={variant} size={size}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Completează cursul
      </Button>
    </Link>
  );
};
