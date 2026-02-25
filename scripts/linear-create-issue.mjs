#!/usr/bin/env node
/**
 * Create a Linear issue via the GraphQL API.
 * Requires: LINEAR_API_KEY in the environment.
 *
 * Usage:
 *   LINEAR_API_KEY=... node scripts/linear-create-issue.mjs "Title" "Description"
 *   Or with the default test ticket:
 *   LINEAR_API_KEY=... node scripts/linear-create-issue.mjs
 *
 * Team ID is taken from LINEAR_TEAM_ID (default: Clasper team from your config).
 */

const LINEAR_API = "https://api.linear.app/graphql";
const DEFAULT_TEAM_ID = "faabef33-fdda-4d42-9d2c-e4d21754d446"; // Clasper team

const apiKey = process.env.LINEAR_API_KEY;
const teamId = process.env.LINEAR_TEAM_ID || DEFAULT_TEAM_ID;

if (!apiKey) {
  console.error("Set LINEAR_API_KEY in the environment.");
  process.exit(1);
}

const title = process.argv[2] || "Add TEST_AO constant to src/index.ts";
const description =
  process.argv[3] ||
  `Add:
\`export const TEST_AO = "linear_ao_working";\`

Do not modify any other files.
No refactor.
Ensure build passes.`;

const query = `
  mutation($title: String!, $description: String!, $teamId: String!) {
    issueCreate(input: { title: $title, description: $description, teamId: $teamId }) {
      success
      issue { id identifier title url }
    }
  }
`;

const body = JSON.stringify({
  query,
  variables: { title, description, teamId },
});

const res = await fetch(LINEAR_API, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: apiKey,
  },
  body,
});

const data = await res.json();

if (data.errors?.length) {
  console.error("Linear API error:", data.errors[0].message);
  process.exit(1);
}

const created = data.data?.issueCreate;
if (!created?.success || !created.issue) {
  console.error("Unexpected response:", JSON.stringify(data, null, 2));
  process.exit(1);
}

const issue = created.issue;
console.log("Created:", issue.identifier, issue.title);
console.log(issue.url);
