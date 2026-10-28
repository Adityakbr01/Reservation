import { readFileSync } from "fs";

const file = "C:/Users/ADITYA/.gemini/antigravity-ide/brain/99f242ce-ef75-4506-93d6-84003acb2ea4/.system_generated/logs/transcript.jsonl";
const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);

for (let i = 1700; i < 1748; i++) {
  const obj = JSON.parse(lines[i]);
  if (obj.type === "USER_INPUT") {
    console.log(`[Step ${obj.step_index}] USER:`, obj.content);
  }
}
