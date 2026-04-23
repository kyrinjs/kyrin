/**
 * Kyrin Migration - CLI Prompts
 * CLI interface for migration warnings and confirmations
 */

import { createInterface } from "readline";
import type { MigrationPlan } from "./runner";
import type { SchemaDiff } from "./differ";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function printBox(title: string, lines: string[]): void {
  const width = Math.max(title.length, ...lines.map(l => l.length)) + 4;
  const border = "═".repeat(width);
  
  console.log(`\n╔${border}╗`);
  console.log(`║ ${title}${" ".repeat(width - title.length - 1)}║`);
  console.log(`╟${border}╢`);
  
  for (const line of lines) {
    console.log(`║ ${line}${" ".repeat(width - line.length - 1)}║`);
  }
  
  console.log(`╚${border}╝\n`);
}

export async function confirmMigration(plan: MigrationPlan): Promise<boolean> {
  const diff = plan.diff;
  const lines: string[] = [];

  lines.push(`Table: ${plan.table}`);
  lines.push("");

  if (diff.added.length > 0) {
    lines.push("Added columns:");
    for (const col of diff.added) {
      lines.push(`  + ${col.name} (${col.type}${col.nullable ? "" : " NOT NULL"})`);
    }
  }

  if (diff.removed.length > 0) {
    lines.push("");
    lines.push("⚠ WARNING: Columns will be DROPPED:");
    for (const col of diff.removed) {
      lines.push(`  - ${col.name} (${col.type})`);
    }
  }

  if (diff.typeChanged.length > 0) {
    lines.push("");
    lines.push("⚠ WARNING: Column types changed:");
    for (const change of diff.typeChanged) {
      lines.push(`  ~ ${change.column}: ${change.from} → ${change.to}`);
    }
  }

  if (diff.nullableChanged.length > 0) {
    lines.push("");
    lines.push("Nullable changes:");
    for (const change of diff.nullableChanged) {
      lines.push(`  ~ ${change.column}: nullable=${change.from} → nullable=${change.to}`);
    }
  }

  const hasDataLoss = diff.removed.length > 0 || diff.typeChanged.length > 0;

  if (hasDataLoss) {
    printBox("⚠ MIGRATION WARNING - DATA LOSS RISK", lines);
    console.log("⚠ This migration may result in DATA LOSS.");
    console.log("  The following will be affected:\n");
    
    if (diff.removed.length > 0) {
      console.log(`  • ${diff.removed.length} column(s) will be dropped`);
      if ((diff as any).removedRows > 0) {
        console.log(`  Data loss: ~${(diff as any).removedRows} rows will be affected`);
      }
    }
    if (diff.typeChanged.length > 0) {
      console.log(`  • ${diff.typeChanged.length} column(s) will change type`);
    }
  } else {
    printBox("🔍 Migration Required", lines);
  }

  const answer = await prompt("Do you want to continue with migration? [y/N]: ");
  
  rl.close();
  
  return answer.toLowerCase().startsWith("y");
}

export async function confirmForceMigrate(): Promise<boolean> {
  const answer = await prompt(
    "Table already exists. Do you want to DROP and recreate? [y/N]: "
  );
  
  rl.close();
  
  return answer.toLowerCase().startsWith("y");
}

export async function printDryRun(plan: MigrationPlan): Promise<void> {
  console.log("\n📋 DRY RUN - No changes will be made\n");
  console.log(`Migration: ${plan.name}`);
  console.log(`Table: ${plan.table}\n`);

  if (plan.sql.length === 0) {
    console.log("No changes needed.\n");
    return;
  }

  console.log("SQL to be executed:\n");
  
  for (let i = 0; i < plan.sql.length; i++) {
    console.log(`  ${i + 1}. ${plan.sql[i]}`);
  }
  
  console.log("");
}

export function printSuccess(result: any): void {
  console.log(`\n✓ Migration completed: ${result.name}`);
  console.log(`  Executed ${result.executed.length} statement(s)\n`);
}

export function printError(result: any): void {
  console.log(`\n✗ Migration failed: ${result.name}`);
  console.log(`  Error: ${result.error}`);
  console.log(`  Executed ${result.executed.length} statement(s) before failure\n`);
}

export function printSkipped(reason: string): void {
  console.log(`\n⏭ Skipped: ${reason}\n`);
}