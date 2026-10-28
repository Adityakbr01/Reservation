import { readFileSync } from "fs";

const file = "C:/Users/ADITYA/.gemini/antigravity-ide/brain/99f242ce-ef75-4506-93d6-84003acb2ea4/.system_generated/logs/transcript.jsonl";
const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);

for (let i = 1700; i < 1748; i++) {
  const obj = JSON.parse(lines[i]);
  if (obj.tool_calls) {
    for (const tc of obj.tool_calls) {
      console.log(`[Step ${obj.step_index}] Tool: ${tc.name}`);
      if (tc.name === "replace_file_content" || tc.name === "write_to_file") {
        console.log(`  File: ${tc.args.TargetFile}`);
        console.log(`  Desc: ${tc.args.Description || tc.args.Instruction}`);
      }
      if (tc.name === "run_command") {
        console.log(`  Cmd: ${tc.args.CommandLine}`);
      }
    }
  }
}
