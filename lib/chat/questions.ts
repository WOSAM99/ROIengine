export const QUESTION_KEYS = ["LOST_MONEY", "BEST_PM", "MARGIN_HURT"] as const;

export type QuestionKey = (typeof QUESTION_KEYS)[number];

export type QuestionDef = {
  key: QuestionKey;
  label: string;
  description: string;
};

export const QUESTIONS: Record<QuestionKey, QuestionDef> = {
  LOST_MONEY: {
    key: "LOST_MONEY",
    label: "Which jobs lost money?",
    description: "Unprofitable jobs grouped by project type and PM.",
  },
  BEST_PM: {
    key: "BEST_PM",
    label: "Which PM performs best?",
    description: "Project manager margin vs. company average.",
  },
  MARGIN_HURT: {
    key: "MARGIN_HURT",
    label: "What is hurting margins?",
    description: "Ranked drags on gross margin with estimated $ impact.",
  },
};

export function isQuestionKey(value: string): value is QuestionKey {
  return (QUESTION_KEYS as readonly string[]).includes(value);
}
