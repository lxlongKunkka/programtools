import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

function cleanText(text) {
    // Remove page numbers like "第 1 页 / 共 10 页"
    return text.replace(/第\s*\d+\s*页\s*\/\s*共\s*\d+\s*页/g, '');
}

function parseAnswers(text) {
    const answers = {};
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("题") && line.includes("号")) {
            const nums = line.match(/\b\d+\b/g);
            if (nums) {
                // Check next few lines for "答案"
                for (let j = 1; j < 5; j++) {
                    if (i + j < lines.length) {
                        const ansLine = lines[i + j];
                        if (ansLine.includes("答案")) {
                            const ans = ansLine.match(/\b[A-E]\b/g);
                            if (ans && nums.length === ans.length) {
                                for (let k = 0; k < nums.length; k++) {
                                    answers[parseInt(nums[k])] = ans[k];
                                }
                            } else if (nums.length > 0 && ans && ans.length > 0) {
                                const limit = Math.min(nums.length, ans.length);
                                for (let k = 0; k < limit; k++) {
                                    answers[parseInt(nums[k])] = ans[k];
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return answers;
}

function parseQuestions(text, answersMap) {
    const questions = [];
    const pattern = /(?:第\s*(\d+)\s*题)|(?:(\d+\.\d+)\s*编程题)/g;
    let match;
    const matches = [];
    
    while ((match = pattern.exec(text)) !== null) {
        matches.push({
            index: match.index,
            qNumStr: match[1] || match[2],
            qType: match[1] ? "choice" : "programming",
            length: match[0].length
        });
    }

    for (let i = 0; i < matches.length; i++) {
        const startIdx = matches[i].index;
        const endIdx = (i < matches.length - 1) ? matches[i+1].index : text.length;
        
        let content = text.substring(startIdx, endIdx);
        content = content.substring(matches[i].length); // Remove header

        const qNum = parseInt(matches[i].qNumStr) || matches[i].qNumStr;
        const qType = matches[i].qType;

        const qData = {
            id: qNum,
            type: qType,
            stem: "",
            options: {},
            answer: (qType === "choice" ? (answersMap[qNum] || "") : ""),
            input_format: "",
            output_format: "",
            samples: [],
            source_code: ""
        };

        if (qType === "choice") {
            const optPattern = /\n\s*([A-E])[\.\、\s]/g;
            let optMatch;
            const optMatches = [];
            while ((optMatch = optPattern.exec(content)) !== null) {
                optMatches.push({
                    index: optMatch.index,
                    label: optMatch[1],
                    length: optMatch[0].length
                });
            }

            if (optMatches.length > 0) {
                qData.stem = content.substring(0, optMatches[0].index).trim();
                for (let j = 0; j < optMatches.length; j++) {
                    const optStart = optMatches[j].index + optMatches[j].length;
                    const optEnd = (j < optMatches.length - 1) ? optMatches[j+1].index : content.length;
                    const optText = content.substring(optStart, optEnd).trim();
                    qData.options[optMatches[j].label] = optText;
                }

                // Heuristic: If options are empty, try to find them in the stem
                const emptyOptions = Object.values(qData.options).every(v => !v || v.length < 2);
                if (emptyOptions && optMatches.length >= 2) {
                    const stemLines = qData.stem.split('\n').map(l => l.trim()).filter(l => l);
                    // If we have enough lines at the end of stem that match the number of options
                    if (stemLines.length >= optMatches.length) {
                        const potentialOptions = stemLines.slice(-optMatches.length);
                        // Assign them to options
                        Object.keys(qData.options).forEach((key, idx) => {
                            qData.options[key] = potentialOptions[idx];
                        });
                        // Remove them from stem
                        qData.stem = stemLines.slice(0, -optMatches.length).join('\n');
                    }
                }
            } else {
                qData.stem = content.trim();
            }
        } else if (qType === "programming") {
            // Simplified programming parsing
            // Extract title
            const titleMatch = content.match(/试题名称：(.*?)\n/);
            if (titleMatch) qData.title = titleMatch[1].trim();

            // Extract sections
            const sectionPattern = /\n\s*(\d+\.\d+\.\d+)\s+(.*?)\n/g;
            let secMatch;
            const sections = {};
            const secMatches = [];
            while ((secMatch = sectionPattern.exec(content)) !== null) {
                secMatches.push({
                    index: secMatch.index,
                    title: secMatch[2].trim(),
                    endIndex: secMatch.index + secMatch[0].length
                });
            }

            for (let j = 0; j < secMatches.length; j++) {
                const start = secMatches[j].endIndex;
                const end = (j < secMatches.length - 1) ? secMatches[j+1].index : content.length;
                sections[secMatches[j].title] = content.substring(start, end).trim();
            }

            qData.stem = sections["题目描述"] || "";
            qData.input_format = sections["输入格式"] || "";
            qData.output_format = sections["输出格式"] || "";
            qData.source_code = sections["参考程序"] || "";

            if (sections["数据范围"]) qData.stem += "\n\n**数据范围**\n\n" + sections["数据范围"];
            if (sections["样例解释"]) qData.stem += "\n\n**样例解释**\n\n" + sections["样例解释"];

            // Samples
            const samplePattern = /\n\s*\d+\.\d+\.\d+\.\d+\s+(输入样例|输出样例)\s*(\d+)?/g;
            let sampMatch;
            const sampleInputs = [];
            const sampleOutputs = [];
            const sampMatches = [];
            while ((sampMatch = samplePattern.exec(content)) !== null) {
                sampMatches.push({
                    index: sampMatch.index,
                    type: sampMatch[1],
                    endIndex: sampMatch.index + sampMatch[0].length
                });
            }

            for (let j = 0; j < sampMatches.length; j++) {
                const start = sampMatches[j].endIndex;
                let end = content.length;
                if (j < sampMatches.length - 1) {
                    end = sampMatches[j+1].index;
                } else {
                    // Try to find next main header
                    const nextHeader = content.substring(start).match(/\n\s*\d+\.\d+\.\d+\s+/);
                    if (nextHeader) end = start + nextHeader.index;
                }
                
                const text = content.substring(start, end).trim();
                if (sampMatches[j].type.includes("输入")) sampleInputs.push(text);
                else sampleOutputs.push(text);
            }

            const maxSamples = Math.max(sampleInputs.length, sampleOutputs.length);
            for (let k = 0; k < maxSamples; k++) {
                qData.samples.push({
                    input: sampleInputs[k] || "",
                    output: sampleOutputs[k] || ""
                });
            }
        }
        questions.push(qData);
    }
    return questions;
}

export async function parsePdf(pdfPath) {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const rawText = data.text;
    const cleanedText = cleanText(rawText);
    const answers = parseAnswers(cleanedText);
    const questions = parseQuestions(cleanedText, answers);
    return questions;
}
