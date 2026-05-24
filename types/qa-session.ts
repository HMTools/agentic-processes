/**
 * Types for Q&A sessions used when agents need to gather
 * missing information from users before proceeding.
 * 
 * Used by: process-QnA-session skill
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

/**
 * Status of an individual question in a Q&A session file
 */
export type QuestionStatus = 'unanswered' | 'answered' | 'refined' | 'completed';

/**
 * Overall status of a Q&A session file
 * Derived from individual question statuses:
 * - 'pending': All questions unanswered
 * - 'partial': Some questions answered, some unanswered
 * - 'completed': All questions answered or completed
 */
export type SessionStatus = 'pending' | 'partial' | 'completed';

/**
 * A single iteration of an answer to a question
 */
export interface AnswerIteration {
  /** The answer text */
  answer: string;

  /** When this answer iteration was provided (ISO-8601 format) */
  timestamp: ISOTimestamp;

  /** Iteration number (1 for first answer, increments with refinements) */
  iteration: number;
}

/**
 * Extended question type for Q&A session files
 * Includes status tracking and answer history
 */
export interface QASessionQuestion extends QAQuestion {
  /** Current status of this question */
  status: QuestionStatus;

  /** History of all answer iterations for this question */
  answerHistory: AnswerIteration[];
}

/**
 * Q&A session file structure
 * Stored as JSON file in process directory to persist Q&A state
 * across conversation boundaries and enable file-based interaction flows
 */
export interface QASessionFile {
  /** File type identifier */
  type: 'qa-session';

  /** ID of the step this Q&A session belongs to */
  stepId: string;

  /** Name of the step this Q&A session belongs to */
  stepName: string;

  /** When this Q&A session was created (ISO-8601 format) */
  timestamp: ISOTimestamp;

  /** All questions in this session with their current status */
  questions: QASessionQuestion[];

  /**
   * Overall session status (derived from question statuses)
   * - 'pending': All questions are 'unanswered'
   * - 'partial': Mix of answered and unanswered questions
   * - 'completed': All questions are 'answered', 'refined', or 'completed'
   */
  status: SessionStatus;
}
