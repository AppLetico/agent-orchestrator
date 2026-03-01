import chalk from "chalk";
import type { Command } from "commander";
import {
  createPluginRegistry,
  loadConfig,
  type CreateIssueInput,
  type Tracker,
  type ProjectConfig,
} from "@composio/ao-core";

function parseLabels(input: string | undefined): string[] | undefined {
  if (!input) return undefined;
  const labels = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return labels.length > 0 ? labels : undefined;
}

function resolveProject(projectId: string): { project: ProjectConfig } {
  const config = loadConfig();
  const project = config.projects[projectId];
  if (!project) {
    throw new Error(
      `Unknown project: ${projectId}\nAvailable: ${Object.keys(config.projects).join(", ")}`,
    );
  }
  return { project };
}

export function registerIssues(program: Command): void {
  const issues = program.command("issues").description("Issue tracker helpers");

  issues
    .command("create")
    .description("Create an issue in the configured tracker for a project")
    .requiredOption("-p, --project <id>", "Project ID")
    .requiredOption("-t, --title <title>", "Issue title")
    .requiredOption("-d, --description <description>", "Issue description")
    .option("-l, --labels <labels>", "Comma-separated labels")
    .option("-a, --assignee <assignee>", "Assignee display name")
    .option("--priority <n>", "Priority number")
    .action(
      async (opts: {
        project: string;
        title: string;
        description: string;
        labels?: string;
        assignee?: string;
        priority?: string;
      }) => {
        try {
          const config = loadConfig();
          const { project } = resolveProject(opts.project);
          if (!project.tracker) {
            throw new Error(`Project ${opts.project} has no tracker configured`);
          }

          const registry = createPluginRegistry();
          await registry.loadFromConfig(config, (pkg: string) => import(pkg));

          const tracker = registry.get<Tracker>("tracker", project.tracker.plugin);
          if (!tracker) {
            throw new Error(`Tracker plugin '${project.tracker.plugin}' not found`);
          }
          if (!tracker.createIssue) {
            throw new Error(`Tracker '${tracker.name}' does not support issue creation`);
          }

          const priorityNum =
            opts.priority !== undefined && opts.priority !== ""
              ? Number.parseInt(opts.priority, 10)
              : undefined;
          if (opts.priority !== undefined && Number.isNaN(priorityNum)) {
            throw new Error("priority must be a number");
          }

          const input: CreateIssueInput = {
            title: opts.title,
            description: opts.description,
            labels: parseLabels(opts.labels),
            assignee: opts.assignee,
            priority: priorityNum,
          };

          const issue = await tracker.createIssue(input, project);
          console.log(chalk.green(`Created ${issue.id}: ${issue.title}`));
          console.log(issue.url);
        } catch (err) {
          console.error(chalk.red(String(err)));
          process.exit(1);
        }
      },
    );
}
