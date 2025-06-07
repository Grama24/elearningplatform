"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FinalQuizDisplayProps {
  courseId: string;
}

export const FinalQuizDisplay: React.FC<FinalQuizDisplayProps> = ({
  courseId,
}) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      const response = await fetch(`/api/courses/${courseId}/final-quiz`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      }
    };
    fetchQuiz();
  }, [courseId]);

  const handleSubmit = async () => {
    const response = await fetch(`/api/courses/${courseId}/final-quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (response.ok) {
      const result = await response.json();
      setScore(result.score);
    }
  };

  if (!quiz) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Quiz Final</h2>
      {quiz.questions.map((question: any, index: number) => (
        <div key={index} className="mb-4">
          <Label>{question.text}</Label>
          {question.answers.map((answer: any, aIndex: number) => (
            <div key={aIndex} className="ml-4 mt-2">
              <input
                type="radio"
                name={`question-${index}`}
                value={answer.id}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    [`question-${index}`]: e.target.value,
                  })
                }
              />
              <Label>{answer.text}</Label>
            </div>
          ))}
        </div>
      ))}
      <Button onClick={handleSubmit}>Trimite Răspunsurile</Button>
      {score !== null && <div>Scorul tău: {score}</div>}
    </div>
  );
};
