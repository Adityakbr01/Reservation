const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'server-laravel', 'app', 'Models');
const files = fs.readdirSync(modelsDir);

let updated = 0;
for (const file of files) {
  if (!file.endsWith('.php') || file === 'User.php') continue;
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('use HasHexId;')) {
    content = content.replace(/(class\s+\w+\s+extends\s+Model\s*\{)/, 'use App\\Models\\Concerns\\HasHexId;\n\n$1\n    use HasHexId;');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', file);
    updated++;
  }
}

console.log(`Total models updated: ${updated}`);

