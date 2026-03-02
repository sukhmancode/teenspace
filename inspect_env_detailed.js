import fs from 'fs';
const content = fs.readFileSync('.env', 'utf8');
content.split('').forEach((char, i) => {
    console.log(`${i}: ${char.charCodeAt(0)} (${char})`);
});
