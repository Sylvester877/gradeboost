import type { QuizQuestion } from "@/db/schema";

/**
 * Local demo content used when no OpenRouter API key is configured,
 * so quiz + flashcard generation still work end-to-end.
 */

type QItem = QuizQuestion & { tags: string[] };
type CardItem = { front: string; back: string; tags: string[] };

const QUIZ_BANK: QItem[] = [
  {
    question: "In a right-angled triangle the two shorter sides are 3 cm and 4 cm. What is the length of the hypotenuse?",
    options: ["5 cm", "6 cm", "7 cm", "12 cm"],
    answer: 0,
    explanation: "By Pythagoras: c = sqrt(3² + 4²) = sqrt(25) = 5 cm.",
    tags: ["pythagoras", "trigonometry", "measurement"],
  },
  {
    question: "The hypotenuse is 13 cm and one shorter side is 5 cm. What is the other side?",
    options: ["8 cm", "12 cm", "sqrt(194) cm", "144 cm"],
    answer: 1,
    explanation: "a = sqrt(13² − 5²) = sqrt(169 − 25) = sqrt(144) = 12 cm.",
    tags: ["pythagoras", "measurement"],
  },
  {
    question: "What is sin(30°)?",
    options: ["1/2", "sqrt(3)/2", "1", "0"],
    answer: 0,
    explanation: "sin(30°) = 1/2 — a standard exact value.",
    tags: ["trigonometry", "measurement"],
  },
  {
    question: "What is cos(60°)?",
    options: ["1/2", "sqrt(3)/2", "0", "1"],
    answer: 0,
    explanation: "cos(60°) = 1/2.",
    tags: ["trigonometry", "measurement"],
  },
  {
    question: "What is tan(45°)?",
    options: ["0", "1", "sqrt(3)", "1/sqrt(3)"],
    answer: 1,
    explanation: "tan(45°) = opposite/adjacent = 1.",
    tags: ["trigonometry", "measurement"],
  },
  {
    question: "SOH-CAH-TOA: cosine is equal to…",
    options: ["opposite/hypotenuse", "adjacent/hypotenuse", "opposite/adjacent", "adjacent/opposite"],
    answer: 1,
    explanation: "CAH → cos = adjacent / hypotenuse.",
    tags: ["trigonometry", "measurement"],
  },
  {
    question: "What is the gradient of the line through (1, 2) and (3, 8)?",
    options: ["3", "6", "2", "4"],
    answer: 0,
    explanation: "m = (8 − 2)/(3 − 1) = 6/2 = 3.",
    tags: ["linear", "algebra"],
  },
  {
    question: "What is the y-intercept of y = 3x − 5?",
    options: ["3", "−5", "5", "−3"],
    answer: 1,
    explanation: "In y = mx + c, c = −5 is the y-intercept.",
    tags: ["linear", "algebra"],
  },
  {
    question: "What is the gradient of a line perpendicular to y = 2x + 1?",
    options: ["2", "−1/2", "1/2", "−2"],
    answer: 1,
    explanation: "Perpendicular gradients multiply to −1, so m = −1/2.",
    tags: ["linear", "algebra"],
  },
  {
    question: "Two parallel lines have gradients that are…",
    options: ["equal", "negative reciprocals", "zero", "undefined"],
    answer: 0,
    explanation: "Parallel lines share the same gradient.",
    tags: ["linear", "algebra"],
  },
  {
    question: "Simplify a³ × a⁴.",
    options: ["a⁷", "a¹²", "a", "a⁻¹"],
    answer: 0,
    explanation: "Add indices: a^(3+4) = a⁷.",
    tags: ["indices", "algebra"],
  },
  {
    question: "What is the value of a⁰ (a ≠ 0)?",
    options: ["0", "1", "a", "undefined"],
    answer: 1,
    explanation: "Any non-zero base to the power 0 equals 1.",
    tags: ["indices", "algebra"],
  },
  {
    question: "Simplify a⁻².",
    options: ["−a²", "1/a²", "a²", "−2a"],
    answer: 1,
    explanation: "A negative index means reciprocal: a⁻² = 1/a².",
    tags: ["indices", "algebra"],
  },
  {
    question: "Simplify √50.",
    options: ["5√2", "2√5", "25√2", "√25"],
    answer: 0,
    explanation: "√50 = √(25 × 2) = 5√2.",
    tags: ["surds", "indices", "algebra"],
  },
  {
    question: "The probability of an impossible event is…",
    options: ["0", "1", "0.5", "undefined"],
    answer: 0,
    explanation: "An impossible event never occurs, so P = 0.",
    tags: ["probability"],
  },
  {
    question: "What is the mean of 4, 6 and 8?",
    options: ["6", "5", "7", "18"],
    answer: 0,
    explanation: "Mean = (4 + 6 + 8) ÷ 3 = 18 ÷ 3 = 6.",
    tags: ["statistics"],
  },
];

const CARD_BANK: CardItem[] = [
  { front: "State Pythagoras' theorem.", back: "$$a^2 + b^2 = c^2$$ where $c$ is the hypotenuse.", tags: ["pythagoras", "measurement"] },
  { front: "Define the hypotenuse.", back: "The longest side of a right-angled triangle; opposite the $90°$ angle.", tags: ["pythagoras", "trigonometry"] },
  { front: "$\\sin\\theta = ?$", back: "$$\\sin\\theta = \\dfrac{\\text{opposite}}{\\text{hypotenuse}}$$", tags: ["trigonometry"] },
  { front: "$\\cos\\theta = ?$", back: "$$\\cos\\theta = \\dfrac{\\text{adjacent}}{\\text{hypotenuse}}$$", tags: ["trigonometry"] },
  { front: "$\\tan\\theta = ?$", back: "$$\\tan\\theta = \\dfrac{\\text{opposite}}{\\text{adjacent}}$$", tags: ["trigonometry"] },
  { front: "Gradient formula (two points)", back: "$$m = \\dfrac{y_2 - y_1}{x_2 - x_1}$$", tags: ["linear", "algebra"] },
  { front: "Gradient-intercept form of a line", back: "$$y = mx + c$$ ($m$ = gradient, $c$ = y-intercept)", tags: ["linear", "algebra"] },
  { front: "Condition for perpendicular lines", back: "$$m_1 \\times m_2 = -1$$", tags: ["linear", "algebra"] },
  { front: "First index law (multiplication)", back: "$$a^m \\times a^n = a^{m+n}$$", tags: ["indices", "algebra"] },
  { front: "Zero index law", back: "$$a^0 = 1 \\quad (a \\neq 0)$$", tags: ["indices", "algebra"] },
  { front: "Negative index law", back: "$$a^{-n} = \\dfrac{1}{a^n}$$", tags: ["indices", "algebra"] },
  { front: "Simplify $\\sqrt{50}$", back: "$$\\sqrt{50} = 5\\sqrt{2}$$", tags: ["surds", "indices"] },
  { front: "Exact value of $\\sin 45°$", back: "$$\\sin 45° = \\dfrac{1}{\\sqrt{2}}$$", tags: ["trigonometry"] },
  { front: "Mean of a data set", back: "$$\\text{mean} = \\dfrac{\\text{sum of values}}{\\text{number of values}}$$", tags: ["statistics"] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function matches(tags: string[], topic: string): boolean {
  const t = topic.toLowerCase();
  return tags.some((tag) => t.includes(tag) || tag.includes(t));
}

export function demoQuiz(
  topic: string,
  count: number
): { title: string; questions: QuizQuestion[] } {
  const pool = QUIZ_BANK.filter((q) => !topic || matches(q.tags, topic));
  const usePool = pool.length >= Math.min(count, 3) ? pool : QUIZ_BANK;
  const picked = shuffle(usePool).slice(0, Math.min(count, usePool.length));
  return {
    title: topic ? `Quiz: ${topic}` : "Mixed maths quiz",
    questions: picked.map(({ tags: _tags, ...q }) => q),
  };
}

export function demoFlashcards(
  topic: string,
  count: number
): { title: string; cards: { front: string; back: string }[] } {
  const pool = CARD_BANK.filter((c) => !topic || matches(c.tags, topic));
  const usePool = pool.length >= Math.min(count, 3) ? pool : CARD_BANK;
  const picked = shuffle(usePool).slice(0, Math.min(count, usePool.length));
  return {
    title: topic ? `Cards: ${topic}` : "Mixed revision cards",
    cards: picked.map(({ front, back }) => ({ front, back })),
  };
}
