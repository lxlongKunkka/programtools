import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../temp_levels.txt');
const outputFile = path.join(__dirname, '../src/utils/sokoban_levels.js');

const content = fs.readFileSync(inputFile, 'utf8');
const sections = content.split('*************************************');

const levels = [];

sections.forEach(section => {
    const lines = section.split('\n');
    const mapLines = [];
    let readingMap = false;

    for (let line of lines) {
        // Skip header lines
        if (line.trim().startsWith('Maze:') || 
            line.trim().startsWith('File offset:') || 
            line.trim().startsWith('Size X:') || 
            line.trim().startsWith('Size Y:') || 
            line.trim().startsWith('End:') || 
            line.trim().startsWith('Length:')) {
            continue;
        }

        // If line is empty, it might be part of the map or outside
        // But the map is usually a block of text.
        // We can detect the map by looking for 'X' or '#'
        if (line.includes('X') || line.includes('#')) {
            readingMap = true;
        }

        if (readingMap) {
            // Map characters: X, ., *, @, &, space
            // We need to convert them to standard XSB:
            // X -> #
            // * -> $ (Box)
            // . -> . (Goal)
            // @ -> @ (Player)
            // & -> * (Box on Goal)
            // + -> + (Player on Goal) - not seen but good to have
            
            // Note: In the file, * is Box ($).
            // & is Box on Goal (*).
            
            let convertedLine = '';
            for (let char of line) {
                switch (char) {
                    case 'X': convertedLine += '#'; break;
                    case '*': convertedLine += '$'; break;
                    case '.': convertedLine += '.'; break;
                    case '@': convertedLine += '@'; break;
                    case '&': convertedLine += '*'; break; // Box on Goal
                    case '+': convertedLine += '+'; break;
                    case ' ': convertedLine += ' '; break;
                    default: convertedLine += ' '; break; // Treat unknown as space
                }
            }
            mapLines.push(convertedLine);
        }
    }

    // Trim empty lines from start and end of mapLines
    // Also find the max width to pad lines? No, XSB doesn't strictly require padding but it's good.
    // Actually, we should just keep the lines as is, but remove empty lines at start/end.
    
    // Remove leading empty lines (or lines with only spaces)
    while (mapLines.length > 0 && mapLines[0].trim() === '') {
        mapLines.shift();
    }
    // Remove trailing empty lines
    while (mapLines.length > 0 && mapLines[mapLines.length - 1].trim() === '') {
        mapLines.pop();
    }

    if (mapLines.length > 0) {
        levels.push(mapLines);
    }
});

const jsContent = `export const levels = ${JSON.stringify(levels, null, 2)};`;

fs.writeFileSync(outputFile, jsContent);
console.log(`Parsed ${levels.length} levels.`);
