"use client";

import { NavbarRoutes } from "@/components/navbar-routes";
import { MobileSidebar } from "./mobile-sidebar";
import { usePathname } from "next/navigation";

const getPageName = (pathname: string) => {
  if (pathname === "/") return "Home";
  if (pathname === "/search") return "Browse Courses";
  if (pathname === "/certificates") return "My Certificates";
  if (pathname.startsWith("/teacher/courses")) return "Manage Courses";
  if (pathname.startsWith("/teacher/analytics")) return "Analytics";
  if (pathname.startsWith("/courses")) return "Course Details";
  return "Home";
};

export const Navbar = () => {
  const pathname = usePathname();
  const pageName = getPageName(pathname);

  return (
    <div className="p-4 h-full flex items-center justify-between bg-white border-b shadow-sm">
      <div className="flex items-center gap-x-4">
        <MobileSidebar />
        <div className="hidden md:flex text-xl font-semibold text-gray-700">
          {pageName}
        </div>
      </div>
      <NavbarRoutes />
    </div>
  );
};
