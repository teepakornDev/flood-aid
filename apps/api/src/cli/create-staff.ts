import "reflect-metadata";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import type { StaffRole } from "@floodaid/contracts";
import { isEmail } from "class-validator";
import { DataSource } from "typeorm";
import { EnvironmentError } from "../common/environment";
import { databaseOptions } from "../database/database-options";
import { AuthRepository } from "../modules/auth/auth.repository";
import { hashStaffPassword, normalizeStaffEmail } from "../modules/auth/staff-password";
import { staffRoles } from "../modules/auth/staff-session";

class InputError extends Error {}

async function readAccount(reset: boolean) {
  if (!stdin.isTTY || !stdout.isTTY) throw new InputError("Run the staff command in an interactive terminal.");

  let hidden = false;
  const output = new Writable({
    write(chunk: Buffer, _encoding, done) {
      if (hidden) done();
      else stdout.write(chunk, done);
    },
  });
  const terminal = createInterface({ input: stdin, output, terminal: true, historySize: 0 });
  const cancel = new AbortController();
  terminal.on("SIGINT", () => cancel.abort());
  terminal.once("close", () => cancel.abort());
  const options = { signal: cancel.signal };

  async function ask<Value>(prompt: string, parse: (answer: string) => Value | undefined, hint: string): Promise<Value> {
    while (true) {
      const value = parse(await terminal.question(prompt, options));
      if (value !== undefined) return value;
      stdout.write(`${hint}\n`);
    }
  }

  async function askPassword(prompt: string): Promise<string> {
    stdout.write(prompt);
    const answer = await terminal.question("", options);
    stdout.write("\n");
    return answer;
  }

  try {
    const email = await ask("Staff email: ", (answer) => {
      const value = normalizeStaffEmail(answer);
      return value.length <= 254 && isEmail(value) ? value : undefined;
    }, "Enter a valid email of up to 254 characters.");
    let profile: { name: string; role: StaffRole } | undefined;
    if (!reset) {
      const name = await ask("Display name: ", (answer) => {
        const value = answer.trim();
        return value && [...value].length <= 100 && !/\p{Cc}/u.test(value) ? value : undefined;
      }, "Enter a display name of 1–100 characters without control characters.");
      const role = await ask<StaffRole>(`Role (${staffRoles.join(", ")}): `,
        (answer) => staffRoles.find((candidate) => candidate === answer.trim().toUpperCase()),
        "Choose one of the listed staff roles.");
      profile = { name, role };
    }

    hidden = true;
    while (true) {
      const password = await askPassword("Password (hidden, 15–128 characters): ");
      const length = [...password].length;
      if (length < 15 || length > 128) {
        stdout.write("Use a password of 15–128 characters.\n");
        continue;
      }
      const confirmation = await askPassword("Confirm password (hidden): ");
      if (confirmation === password) return { email, profile, password };
      stdout.write("The passwords did not match. Enter the password again.\n");
    }
  } finally {
    if (hidden && cancel.signal.aborted) stdout.write("\n");
    terminal.close();
  }
}

async function main(): Promise<void> {
  const reset = process.argv[2] === "--reset-password";
  if (process.argv.length > (reset ? 3 : 2)) throw new InputError("The staff command takes no additional arguments.");
  const { email, profile, password } = await readAccount(reset);
  const passwordHash = await hashStaffPassword(password);
  const database = new DataSource(databaseOptions());
  await database.initialize();
  try {
    const accounts = new AuthRepository(database);
    if (profile) {
      const created = await accounts.createAccount(email, profile.name, profile.role, passwordHash);
      if (!created) throw new InputError("A staff account already exists for that email.");
      process.stdout.write("Staff account created.\n");
    } else {
      const updated = await accounts.resetPassword(email, passwordHash);
      if (!updated) throw new InputError("No staff account exists for that email.");
      process.stdout.write("Staff password reset. All previous sessions revoked.\n");
    }
  } finally {
    await database.destroy();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof InputError || error instanceof EnvironmentError
    ? error.message
    : error instanceof Error && error.name === "AbortError"
      ? "Staff operation cancelled."
      : "Could not update staff credentials. Check the database connection and migrations.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
