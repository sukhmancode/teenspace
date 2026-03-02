import fs from 'fs';
const content = fs.readFileSync('.env', 'utf8');
console.log('Hex:');
for (let i = 0; i < content.length; i++) {
    process.stdout.write(content.charCodeAt(i).toString(16).padStart(2, '0') + ' ');
}
console.log('\nLength:', content.length);
