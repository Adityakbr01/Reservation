import { readFileSync } from "fs";

const file = "C:/Users/ADITYA/.gemini/antigravity-ide/brain/99f242ce-ef75-4506-93d6-84003acb2ea4/.system_generated/logs/transcript.jsonl";
const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);

for (let i = 1710; i < Math.min(1740, lines.length); i++) {
  const obj = JSON.parse(lines[i]);
  console.log(`[Step ${obj.step_index}] Type: ${obj.type}`);
  if (obj.type === "USER_INPUT") {
    console.log("USER:", obj.content);
  }
  if (obj.type === "PLANNER_RESPONSE" && obj.content) {
    console.log("ASSISTANT:", obj.content.slice(0, 300));
  }
  if (obj.thinking) {
    console.log("THINKING:", obj.thinking.slice(0, 300));
  }
  console.log("-----------------------------------------");
}
