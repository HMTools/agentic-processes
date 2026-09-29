/**
 * Schema for view definition files (templates/processes/{category}/{template}/views/{name}/{name}.json)
 *
 * A view is an HTML widget a template attaches to one of its approval-gate steps via viewRef,
 * resolved the same way a step's stepRef is resolved against its own subfolder.
 */

export interface ViewDefinition {
  /** Discriminator field - always "view" */
  type: 'view';

  /** Unique identifier (UUID v4), matched against a template step's viewRef */
  id: string;

  /** Human-readable name — matches its containing views/{name}/ folder */
  name: string;

  /** Path to the widget HTML file, relative to the view's own folder */
  htmlFile: string;

  /**
   * The widget's HTML content, inlined at resolution time (process-creation or template-load) —
   * absent on the authored view JSON on disk, present only on a resolved/embedded copy, mirroring
   * how EmbeddedStepDefinition embeds content rather than a path.
   */
  html?: string;

  /**
   * Operation ids the widget's elements can bind to — each must be a
   * pending-interaction.json option id carrying non-empty `data` at gate time
   */
  operationIds: string[];

  /** Pre-known mock data for template-browsing preview mode, keyed by operation id */
  mockData: Record<string, unknown>;
}
