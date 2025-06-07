import { Logo } from "./logo";
import { SidebarRoutes } from "./sidebar-routes";

export const Sidebar = () => {
  return (
    <div className="h-full border-r flex flex-col overflow-y-auto bg-white shadow-lg">
      <div className="p-8 border-b">
        <Logo />
      </div>
      <div className="flex flex-col w-full flex-1 py-4">
        <SidebarRoutes />
      </div>
      <div className="p-4 border-t">
        <p className="text-sm text-gray-500 text-center">
          QuickLearn © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
