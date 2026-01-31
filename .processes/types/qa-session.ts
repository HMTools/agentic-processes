/**
 * Types for Q&A sessions used when agents need to gather
 * missing information from users before proceeding.
 * 
 * Used by: qa-session.md component
 * Stored in: log.json (qaSession) and memory.json (steps.stepN.qaSession)
 */

import { ISOTimestamp, QuestionId } from "./shared-types";

/**
 * Priority level for Q&A questions
 */
export type QuestionPriority = 'required' | 'optional';

/**
 * Outcome of a Q&A session
 */
export type QASessionOutcome = 'all_answered' | 'partial' | 'deferred';

/**
 * A single question in a Q&A session
 */
export interface QAQuestion {
  /** Unique identifier for the question */
  id: QuestionId;
  
  /** Topic or category of the question */
  topic: string;
  
  /** The actual question text */
  question: string;
  
  /** Whether this question must be answered to proceed */
  priority: QuestionPriority;
  
  /** Why this information is needed */
  context?: string;
  
  /** Available options if this is a multiple-choice question (single-select by default) */
  options?: string[];
}

/**
 * An answer received from the user
 */
export interface QAAnswer {
  /** ID of the question being answered */
  questionId: QuestionId;
  
  /** The user's answer */
  answer: string;
  
  /** When the answer was received */
  timestamp: ISOTimestamp;
}

/**
 * Complete Q&A session record for log.json
 */
export interface QASessionLog {
  /** When the Q&A session was initiated */
  timestamp: ISOTimestamp;
  
  /** All questions that were asked */
  questionsAsked: QAQuestion[];
  
  /** Answers received from the user */
  answersReceived: QAAnswer[];
  
  /** IDs of questions that were not answered */
  unansweredQuestions: QuestionId[];
  
  /** Overall outcome of the session */
  outcome: QASessionOutcome;
}

/**
 * Q&A session summary for memory.json
 * (Lighter weight than full log, captures key information for future steps)
 */
export interface QASessionMemory {
  /** Whether a Q&A session was conducted */
  conducted: boolean;
  
  /** Total number of questions asked */
  questionsCount: number;
  
  /** Number of questions that were answered */
  answeredCount: number;
  
  /** Key answers summarized by topic (for quick reference by later steps) */
  keyAnswers: Record<string, string>;
  
  /** Assumptions made if questions were unanswered */
  assumptions?: string[];
}

/**
 * Q&A configuration for steps that support Q&A sessions
 * Can be included in step definitions
 */
export interface QAConfig {
  /** Whether this step supports Q&A sessions */
  enabled: boolean;
  
  /** When Q&A should be triggered */
  trigger: 'on_gaps' | 'always' | 'manual';
  
  /** Default questions to ask (can be extended dynamically) */
  defaultQuestions?: QAQuestion[];
  
  /** Whether to allow proceeding with partial answers */
  allowPartialAnswers: boolean;
}
