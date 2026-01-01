import fs from 'fs';

export function jsonToHydroMd(jsonPath) {
    const problems = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const mdLines = [];
    const answerLines = [];
    
    mdLines.push("# GESP 题目导出");
    mdLines.push("");
    mdLines.push("## 题目列表");
    mdLines.push("");
    
    let globalIndex = 1;
    
    problems.forEach(prob => {
        const stem = (prob.stem || '').trim();
        
        mdLines.push(`${globalIndex}), ${stem}`);
        mdLines.push(`{{ select(${globalIndex}) }}`);
        
        const options = prob.options || {};
        const answer = prob.answer || '';
        
        if (Object.keys(options).length > 0) {
            Object.keys(options).sort().forEach(key => {
                const val = options[key];
                mdLines.push(`- ${key}. ${val.trim()}`);
            });
        } else {
             if (prob.type !== 'programming') {
                 mdLines.push("- (无选项数据)");
             }
        }
        
        answerLines.push(`${globalIndex}: ${answer}`);
        
        mdLines.push("");
        globalIndex++;
    });
    
    const outputMd = jsonPath.replace('.json', '.md');
    fs.writeFileSync(outputMd, mdLines.join('\n'), 'utf-8');
    
    const outputAns = jsonPath.replace('.json', '_answers.txt');
    fs.writeFileSync(outputAns, answerLines.join('\n'), 'utf-8');
    
    return outputMd;
}
