import {
  pgTable, text, timestamp, integer, real, boolean, jsonb, date, serial, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  school: text('school').notNull().default(''),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const otpCodes = pgTable('otp_codes', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  action: text('action').notNull(), // 'login' | 'register'
  name: text('name'),
  ipAddress: text('ip_address'),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  identifier: text('identifier').notNull(),
  action: text('action').notNull(),
  hits: integer('hits').notNull().default(1),
  windowStart: timestamp('window_start').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📚'),
  description: text('description').notNull().default(''),
  masteryLevel: real('mastery_level').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const studySets = pgTable('study_sets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  sourceType: text('source_type').notNull(), // 'pdf' | 'youtube' | 'text'
  sourceContent: text('source_content').notNull().default(''),
  summary: text('summary').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const flashcards = pgTable('flashcards', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  interval: integer('interval').notNull().default(1),
  easeFactor: real('ease_factor').notNull().default(2.5),
  dueDate: timestamp('due_date').notNull().defaultNow(),
  repetitions: integer('repetitions').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const quizItems = pgTable('quiz_items', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: jsonb('options').notNull().$type<string[]>(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const studyLogs = pgTable('study_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  minutesStudied: integer('minutes_studied').notNull().default(0),
  cardsReviewed: integer('cards_reviewed').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const podcasts = pgTable('podcasts', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  script: text('script').notNull(),
  audioUrl: text('audio_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});


export const cornellNotes = pgTable('cornell_notes', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cues: text('cues').notNull().default(''),
  notes: text('notes').notNull().default(''),
  summary: text('summary').notNull().default(''),
  reflection: text('reflection').notNull().default(''),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  studySetUnique: uniqueIndex('cornell_notes_study_set_unique').on(table.studySetId),
}));

export const studySetShares = pgTable('study_set_shares', {
  id: text('id').primaryKey(),
  studySetId: text('study_set_id').notNull().references(() => studySets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tokenHashUnique: uniqueIndex('study_set_shares_token_hash_unique').on(table.tokenHash),
}));
