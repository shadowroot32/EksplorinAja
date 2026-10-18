export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  avatarUrl: string | null;
  createdAt: Date;
};

export type Subject = {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  description: string;
  masteryLevel: number;
  createdAt: Date;
};

export type StudySet = {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  sourceType: string;
  sourceContent: string;
  summary: string;
  createdAt: Date;
};

export type Flashcard = {
  id: string;
  studySetId: string;
  front: string;
  back: string;
  interval: number;
  easeFactor: number;
  dueDate: Date;
  repetitions: number;
  createdAt: Date;
};

export type QuizItem = {
  id: string;
  studySetId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  createdAt: Date;
};

export type ChatMessage = {
  id: string;
  studySetId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export type Activity = {
  id: string;
  userId: string;
  activityType: string;
  description: string;
  createdAt: Date;
};
