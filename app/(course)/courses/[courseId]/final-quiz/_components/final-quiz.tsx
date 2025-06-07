"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface FinalQuizProps {
  courseId: string;
  quiz: {
    id: string;
    minScore: number;
    questions: {
      id: string;
      text: string;
      answers: {
        id: string;
        text: string;
        isCorrect: boolean;
      }[];
    }[];
  };
}

export const FinalQuiz = ({ courseId, quiz }: FinalQuizProps) => {
  const router = useRouter();
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    quiz.questions.forEach((question) => {
      const selectedAnswerId = selectedAnswers[question.id];
      const selectedAnswer = question.answers.find(
        (a) => a.id === selectedAnswerId
      );
      if (selectedAnswer?.isCorrect) {
        correctAnswers++;
      }
    });
    return (correctAnswers / quiz.questions.length) * 100;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const score = calculateScore();
      const isPassed = score >= quiz.minScore;

      const response = await fetch(
        `/api/courses/${courseId}/final-quiz/result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score,
            isPassed,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit quiz");
      }

      if (isPassed) {
        toast.success("Felicitări! Ai trecut quiz-ul final!");
        router.push(`/courses/${courseId}`);
      } else {
        toast.error(
          `Nu ai trecut quiz-ul. Scorul minim necesar este ${quiz.minScore}%.`
        );
      }
    } catch (error) {
      toast.error("Ceva nu a mers bine. Te rugăm să încerci din nou.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quiz Final</h1>
        <div className="text-sm text-muted-foreground">
          Scor minim necesar: {quiz.minScore}%
        </div>
      </div>

      <div className="space-y-8">
        {quiz.questions.map((question, index) => (
          <Card key={question.id} className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {index + 1}. {question.text}
              </h3>
              <RadioGroup
                value={selectedAnswers[question.id]}
                onValueChange={(value) =>
                  handleAnswerSelect(question.id, value)
                }
              >
                {question.answers.map((answer) => (
                  <div key={answer.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={answer.id} id={answer.id} />
                    <Label htmlFor={answer.id}>{answer.text}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            Object.keys(selectedAnswers).length !== quiz.questions.length
          }
        >
          {isSubmitting ? "Se trimite..." : "Trimite răspunsurile"}
        </Button>
      </div>
    </div>
  );
};
