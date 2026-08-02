import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const powershell = readFileSync(resolve(root, "scripts", "sync.ps1"), "utf8");
const bash = readFileSync(resolve(root, "scripts", "sync.sh"), "utf8");
const removedTarget = "\u0052\u006f\u006f";
const removedTargetPattern = new RegExp(
  `${removedTarget} Code|\\.${removedTarget.toLowerCase()}|Targets${removedTarget}|targets-${removedTarget.toLowerCase()}`,
  "i",
);
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

for (const [name, source] of [
  ["sync.ps1", powershell],
  ["sync.sh", bash],
]) {
  expect(source.includes("Kilo Code"), `${name} must identify the current Kilo Code target`);
  expect(!removedTargetPattern.test(source), `${name} must not contain support for the removed target`);
}

expect(powershell.includes("-TargetsKilo"), "sync.ps1 must expose -TargetsKilo");
expect(powershell.includes(".config\\kilo\\AGENTS.md"), "sync.ps1 must use Kilo's current global AGENTS.md path");
expect(powershell.includes(".cline\\rules\\AGENTS.md"), "sync.ps1 must prefer Cline's current global rules path");
expect(powershell.includes('"*\\.cline\\*"'), "sync.ps1 must label the current Cline path correctly");
expect(
  /if \(Test-Path \(Join-Path \$HomeDir "\.cline"\)\)[\s\S]*?elseif \(Test-Path \(Join-Path \$HomeDir "Documents\\Cline"\)\)/.test(powershell),
  "sync.ps1 must use Documents/Cline only as a fallback",
);

expect(bash.includes("--targets-kilo"), "sync.sh must expose --targets-kilo");
expect(bash.includes('$home/.config/kilo/AGENTS.md'), "sync.sh must use Kilo's current global AGENTS.md path");
expect(bash.includes('$home/.cline/rules/AGENTS.md'), "sync.sh must prefer Cline's current global rules path");
expect(bash.includes('*"/.cline/"*|*"/.cline"*)'), "sync.sh must label the current Cline path correctly");
expect(
  /if \[ -d "\$home\/\.cline" \]; then[\s\S]*?elif \[ -d "\$home\/Documents\/Cline" \]; then/.test(bash),
  "sync.sh must use Documents/Cline only as a fallback",
);

if (failures.length > 0) {
  console.error("Sync target verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Sync target verification passed (current Kilo and Cline paths only).");
