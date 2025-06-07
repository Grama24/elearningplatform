"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

export const SidebarItem = ({ icon: Icon, label, href }: SidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive =
    (pathname === "/" && href === "/") ||
    pathname === href ||
    pathname?.startsWith(`${href}/`);

  const onClick = () => {
    router.push(href);
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "w-full flex items-center gap-x-4 text-gray-600 text-base font-medium pl-8 pr-4 py-4 transition-all hover:bg-gray-50",
        isActive && "text-yellow-600 bg-yellow-50 hover:bg-yellow-50"
      )}
    >
      <Icon
        size={24}
        className={cn(
          "text-gray-400 transition-colors",
          isActive && "text-yellow-600"
        )}
      />
      <span>{label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-8 bg-yellow-600 rounded-full" />
      )}
    </button>
  );
};
