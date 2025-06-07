"use client";

import { Category } from "@prisma/client";
import {
  Music,
  Dumbbell,
  Code,
  Camera,
  Video,
  Wrench,
  Calculator,
} from "lucide-react";
import { CategoryItem } from "./category-item";

interface CategoriesProps {
  items: Category[];
}

const iconMap = {
  Music: Music,
  Fitness: Dumbbell,
  "Computer Science": Code,
  Photography: Camera,
  Filming: Video,
  "Electrical Engineering": Wrench,
  Accounting: Calculator,
} as Record<string, any>;

export const Categories = ({ items }: CategoriesProps) => {
  return (
    <div className="flex items-center gap-x-2 overflow-x-auto pb-2">
      {items.map((item) => (
        <CategoryItem
          key={item.id}
          label={item.name}
          icon={iconMap[item.name]}
          value={item.id}
        />
      ))}
    </div>
  );
};
