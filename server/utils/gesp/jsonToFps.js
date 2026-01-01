import fs from 'fs';

function cleanXmlChars(text) {
    if (!text) return '';
    // Remove invalid XML chars
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function escapeXml(text) {
    if (!text) return '';
    return cleanXmlChars(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDescription(problem) {
    let stem = problem.stem || '';
    const options = problem.options || {};
    
    stem = cleanXmlChars(stem);
    let desc = stem + "\n\n";
    
    if (Object.keys(options).length > 0) {
        desc += "### 选项\n\n";
        Object.keys(options).sort().forEach(key => {
            const val = cleanXmlChars(options[key]);
            desc += `- **${key}**. ${val}\n`;
        });
    }
    return desc;
}

export function jsonToFps(jsonPath, outputPath) {
    const problems = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<fps version="1.2" url="https://github.com/zhblue/freeproblemset/">\n';
    xml += '  <generator name="GESP-Parser" url=""/>\n';
    
    problems.forEach(p => {
        xml += '  <item>\n';
        
        const pType = p.type || 'choice';
        const pId = p.id || '';
        let titleText = '';
        
        if (pType === 'programming') {
            const pTitle = p.title || `编程题 ${pId}`;
            titleText = `GESP 2025-12 C++一级 ${pTitle}`;
        } else {
            titleText = `GESP 2025-12 C++一级 第${pId}题`;
        }
        
        xml += `    <title>${escapeXml(titleText)}</title>\n`;
        xml += `    <time_limit unit="s">1</time_limit>\n`;
        xml += `    <memory_limit unit="mb">128</memory_limit>\n`;
        
        xml += `    <description><![CDATA[${formatDescription(p)}]]></description>\n`;
        
        xml += `    <input><![CDATA[${cleanXmlChars(p.input_format || '无')}]]></input>\n`;
        xml += `    <output><![CDATA[${cleanXmlChars(p.output_format || '无')}]]></output>\n`;
        
        const samples = p.samples || [];
        if (samples.length > 0) {
            const sIn = samples[0].input || '无';
            const sOut = samples[0].output || '无';
            xml += `    <sample_input><![CDATA[${cleanXmlChars(sIn)}]]></sample_input>\n`;
            xml += `    <sample_output><![CDATA[${cleanXmlChars(sOut)}]]></sample_output>\n`;
        }
        
        xml += '  </item>\n';
    });
    
    xml += '</fps>';
    
    fs.writeFileSync(outputPath, xml, 'utf-8');
    return xml;
}
