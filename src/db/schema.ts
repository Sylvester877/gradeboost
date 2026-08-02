import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  real,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/*  Study material / textbook chapters added by the student           */
/* ------------------------------------------------------------------ */
export const SOURCE_TYPES = ["Textbook", "Practice Test", "Notes", "Exam Paper", "Worksheet", "Other"] as const;
export const SUBJECTS = ["Mathematics", "Science", "English", "History", "Geography", "Languages", "Other"] as const;

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  topic: text("topic"),
  subject: text("subject").default("Mathematics").notNull(),
  type: text("type").default("Notes").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  Pre-chunked pieces of uploaded sources for RAG retrieval         */
/* ------------------------------------------------------------------ */
export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    embedding: real("embedding").array(),
  },
  (table) => [{
    sourceIdIdx: index("source_chunks_source_id_idx").on(table.sourceId),
  }]
);

/* ------------------------------------------------------------------ */
/*  AI tutor chat sessions                                            */
/* ------------------------------------------------------------------ */
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sourceId: integer("source_id"), // default source for the session
  subject: text("subject").default("Mathematics").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  AI tutor conversation history                                      */
/* ------------------------------------------------------------------ */
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id, { onDelete: "cascade" }),
  sourceId: integer("source_id"),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  AI generated quizzes                                               */
/* ------------------------------------------------------------------ */
export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
};

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id"),
  title: text("title").notNull(),
  topic: text("topic"),
  difficulty: text("difficulty").default("mixed").notNull(),
  questions: jsonb("questions").$type<QuizQuestion[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  Quiz attempts + scoring                                            */
/* ------------------------------------------------------------------ */
export type QuizResponse = { questionIndex: number; selected: number };

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  responses: jsonb("responses").$type<QuizResponse[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  AI generated flashcards                                            */
/* ------------------------------------------------------------------ */
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id"),
  front: text("front").notNull(),
  back: text("back").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  Study activity log (streaks, points, grade tracking)              */
/* ------------------------------------------------------------------ */
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "chat" | "quiz" | "flashcards"
  sourceId: integer("source_id"),
  minutes: integer("minutes").default(0).notNull(),
  points: integer("points").default(0).notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  Key/value app settings (name, target grade, etc.)                 */
/* ------------------------------------------------------------------ */
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

/* ------------------------------------------------------------------ */
/*  Mastery tracking per topic                                         */
/* ------------------------------------------------------------------ */
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mastery: integer("mastery").default(0).notNull(), // 0-100
  attempts: integer("attempts").default(0).notNull(),
  correct: integer("correct").default(0).notNull(),
  starred: boolean("starred").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
