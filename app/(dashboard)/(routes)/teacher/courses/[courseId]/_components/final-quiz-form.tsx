"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FinalQuizFormProps {
  courseId: string;
}

export const FinalQuizForm: React.FC<FinalQuizFormProps> = ({ courseId }) => {
  const [minScore, setMinScore] = useState<number>(0);
  const [questions, setQuestions] = useState<
    { text: string; answers: { text: string; isCorrect: boolean }[] }[]
  >([]);
  const [existingQuiz, setExistingQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/final-quiz`);
        if (response.ok) {
          const quiz = await response.json();
          setExistingQuiz(quiz);
          setMinScore(quiz.minScore);
          setQuestions(
            quiz.questions.map((q: any) => ({
              text: q.text,
              answers: q.answers.map((a: any) => ({
                text: a.text,
                isCorrect: a.isCorrect,
              })),
            }))
          );
        }
      } catch (error) {
        console.error("Error loading quiz:", error);
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [courseId]);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", answers: [] }]);
  };

  const addAnswer = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answers.push({ text: "", isCorrect: false });
    setQuestions(newQuestions);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/final-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore, questions }),
      });
      if (response.ok) {
        const updatedQuiz = await response.json();
        setExistingQuiz(updatedQuiz);
        alert("Quiz final adăugat cu succes!");
      } else {
        alert("Eroare la adăugarea quiz-ului final.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Ești sigur că vrei să ștergi quiz-ul final?")) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/final-quiz`, {
        method: "DELETE",
      });
      if (response.ok) {
        setExistingQuiz(null);
        setMinScore(0);
        setQuestions([]);
        alert("Quiz final șters cu succes!");
      } else {
        alert("Eroare la ștergerea quiz-ului final.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return <div>Se încarcă...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {existingQuiz ? "Editează Quiz Final" : "Adaugă Quiz Final"}
      </h2>
      {existingQuiz && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">
          Există deja un quiz final pentru acest curs. Poți să-l editezi sau
          să-l ștergi.
        </div>
      )}
      <div className="mb-4">
        <Label htmlFor="minScore">Scor Minim</Label>
        <Input
          id="minScore"
          type="number"
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
        />
      </div>
      {questions.map((question, qIndex) => (
        <div key={qIndex} className="mb-4">
          <Label htmlFor={`question-${qIndex}`}>Întrebare {qIndex + 1}</Label>
          <Input
            id={`question-${qIndex}`}
            value={question.text}
            onChange={(e) => {
              const newQuestions = [...questions];
              newQuestions[qIndex].text = e.target.value;
              setQuestions(newQuestions);
            }}
          />
          {question.answers.map((answer, aIndex) => (
            <div key={aIndex} className="ml-4 mt-2">
              <Label htmlFor={`answer-${qIndex}-${aIndex}`}>
                Răspuns {aIndex + 1}
              </Label>
              <Input
                id={`answer-${qIndex}-${aIndex}`}
                value={answer.text}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[qIndex].answers[aIndex].text = e.target.value;
                  setQuestions(newQuestions);
                }}
              />
              <input
                type="checkbox"
                checked={answer.isCorrect}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[qIndex].answers[aIndex].isCorrect =
                    e.target.checked;
                  setQuestions(newQuestions);
                }}
              />
              <Label htmlFor={`isCorrect-${qIndex}-${aIndex}`}>Corect</Label>
            </div>
          ))}
          <Button onClick={() => addAnswer(qIndex)}>Adaugă Răspuns</Button>
        </div>
      ))}
      <div className="flex gap-2 mt-4">
        <Button onClick={addQuestion}>Adaugă Întrebare</Button>
        <Button onClick={handleSubmit}>
          {existingQuiz ? "Actualizează Quiz" : "Salvează Quiz"}
        </Button>
        {existingQuiz && (
          <Button onClick={handleDelete} variant="destructive">
            Șterge Quiz
          </Button>
        )}
      </div>
    </div>
  );
};
