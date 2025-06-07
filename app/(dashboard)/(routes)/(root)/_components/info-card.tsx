import { IconBadge } from "@/components/icon-badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  numberOfItems: number;
  variant?: "default" | "success";
  label: string;
  icon: LucideIcon;
}

export const InfoCard = ({
  variant,
  icon: Icon,
  numberOfItems,
  label,
}: InfoCardProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white shadow-sm transition-all hover:shadow-md",
        variant === "success" && "bg-green-50/50 border-green-200",
        variant === "default" && "bg-blue-50/50 border-blue-200"
      )}
    >
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex flex-col gap-y-2">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <div className="flex items-center gap-x-2">
            <p className="text-2xl font-bold">{numberOfItems}</p>
            <p className="text-gray-500 text-sm">
              {numberOfItems === 1 ? "Course" : "Courses"}
            </p>
          </div>
        </div>
        <div className="h-12 w-12">
          <IconBadge variant={variant} icon={Icon} />
        </div>
      </div>
    </div>
  );
};
