"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { LogOut, Award } from "lucide-react";
import Link from "next/link";
import { SearchInput } from "./search-input";

import { isTeacher } from "@/lib/teacher";

export const NavbarRoutes = () => {
  const { userId } = useAuth();
  const pathname = usePathname();
  const isTeacherPage = pathname?.startsWith("/teacher");
  const isCoursePage = pathname?.includes("/courses");
  const isSearchPage = pathname === "/search";
  const isCertificatesPage = pathname === "/certificates";

  return (
    <>
      {isSearchPage && (
        <div className="hidden md:block">
          <SearchInput />
        </div>
      )}
      <div className="flex gap-x-2 ml-auto">
        {!isTeacherPage &&
          !isCoursePage &&
          !isSearchPage &&
          !isCertificatesPage && (
            <Link href="/certificates">
              <Button size="sm" variant="ghost">
                <Award className="h-4 w-4 mr-2" />
                My Certificates
              </Button>
            </Link>
          )}
        {isTeacherPage || isCoursePage ? (
          <Link href="/">
            <Button size="sm" variant="ghost">
              <LogOut className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </Link>
        ) : isTeacher(userId) ? (
          <Link href="/teacher/courses">
            <Button size="sm" variant="ghost">
              Teacher Mode
            </Button>
          </Link>
        ) : null}
        <UserButton />
      </div>
    </>
  );
};
