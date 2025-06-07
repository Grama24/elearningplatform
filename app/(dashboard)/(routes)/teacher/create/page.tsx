"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import toast from "react-hot-toast";
import { ImageIcon, BookOpen, LayoutDashboard, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";

const formSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required",
  }),
  description: z.string().optional(),
});

const courseTypes = [
  {
    title: "Complete Course",
    description: "A structured course with chapters and lessons",
    icon: BookOpen,
    value: "full",
    color: "bg-blue-500",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    title: "Mini Course",
    description: "A short course focused on a single topic",
    icon: Sparkles,
    value: "mini",
    color: "bg-purple-500",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
];

const CreatePage = () => {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>("full");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.post("/api/courses", {
        ...values,
        type: selectedType,
      });
      router.push(`/teacher/courses/${response.data.id}`);
      toast.success("Course created successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-col gap-y-2 mb-8">
        <h1 className="text-3xl font-bold">Create a New Course</h1>
        <p className="text-sm text-muted-foreground">
          Choose your course type and fill in the basic information to get
          started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {courseTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.value}
              className={cn(
                "relative cursor-pointer transition-all overflow-hidden",
                selectedType === type.value
                  ? "ring-2 ring-offset-2 " + type.color.replace("bg-", "ring-")
                  : "hover:shadow-md"
              )}
              onClick={() => setSelectedType(type.value)}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-10 bg-gradient-to-br",
                  type.gradient
                )}
              />
              <div className="relative p-6">
                <div className="flex items-center gap-x-4">
                  <div
                    className={cn(
                      "p-2 w-fit rounded-lg",
                      type.color,
                      "bg-opacity-10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-8 h-8",
                        type.color.replace("bg-", "text-")
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{type.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Title</FormLabel>
                <FormControl>
                  <Input
                    disabled={isSubmitting}
                    placeholder="Enter the course title"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Description</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={isSubmitting}
                    placeholder="Enter a brief description of your course"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center gap-x-2">
            <Link href="/teacher/courses">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="ml-auto"
            >
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreatePage;
