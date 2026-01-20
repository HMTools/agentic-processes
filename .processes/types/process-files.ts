/**
 * References to the files that make up a process instance.
 */
export interface ProcessFiles {
  /** Relative path to process.md from process folder */
  process: string;
  
  /** Relative path to memory.md from process folder */
  memory: string;
  
  /** Relative path to log.md from process folder */
  log: string;
}

