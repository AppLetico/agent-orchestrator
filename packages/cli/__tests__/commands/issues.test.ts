import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerIssues } from "../../src/commands/issues.js";

const { mockConfigRef, mockTracker, mockRegistry } = vi.hoisted(() => ({
  mockConfigRef: { current: null as Record<string, unknown> | null },
  mockTracker: {
    name: "linear",
    createIssue: vi.fn(),
  },
  mockRegistry: {
    loadFromConfig: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@composio/ao-core", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import("@composio/ao-core")>();
  return {
    ...actual,
    loadConfig: () => mockConfigRef.current,
    createPluginRegistry: () => mockRegistry,
  };
});

describe("issues command", () => {
  let program: Command;
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockConfigRef.current = {
      projects: {
        "my-app": {
          name: "My App",
          repo: "acme/my-app",
          path: "/tmp/my-app",
          defaultBranch: "main",
          sessionPrefix: "app",
          tracker: { plugin: "linear" },
        },
      },
    };
    mockRegistry.loadFromConfig.mockReset();
    mockRegistry.get.mockReset();
    mockRegistry.get.mockReturnValue(mockTracker);
    mockTracker.createIssue.mockReset();
    mockTracker.createIssue.mockResolvedValue({
      id: "INT-1",
      title: "Test ticket",
      url: "https://linear.app/acme/issue/INT-1",
    });
    program = new Command();
    program.exitOverride();
    registerIssues(program);
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  it("creates ticket via tracker.createIssue", async () => {
    await program.parseAsync([
      "node",
      "test",
      "issues",
      "create",
      "--project",
      "my-app",
      "--title",
      "Test ticket",
      "--description",
      "Body",
      "--labels",
      "backend,ops",
    ]);

    expect(mockTracker.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test ticket",
        description: "Body",
        labels: ["backend", "ops"],
      }),
      expect.objectContaining({ name: "My App" }),
    );
    expect(consoleLog).toHaveBeenCalled();
  });
});
