/**
 * Metadata about the process instance.
 */
export interface ProcessMetadata {
  /** Name of the template used to create this process (e.g., "develop-user-story") */
  template: string;
  
  /** Category of the template (e.g., "development", "testing", "infrastructure") */
  templateCategory: string;
  
  /** ISO 8601 timestamp when the process was created */
  created: string;
  
  /** ISO 8601 timestamp when the process was last updated */
  lastUpdated: string;
  
  /** Absolute path to the project root directory */
  projectPath: string;
  
  /** Relative path to the process folder from project root */
  processPath: string;
}

