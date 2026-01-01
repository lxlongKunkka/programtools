import { load } from 'cheerio';
import fs from 'fs';

function cleanKatex($, elem) {
    if (!elem) return;
    $(elem).find('.katex').each((i, el) => {
        const annotation = $(el).find('annotation[encoding="application/x-tex"]');
        if (annotation.length > 0) {
            const tex = annotation.text();
            if (/^\s*(void|int|char|double|float|bool|long)\s+/.test(tex)) {
                $(el).replaceWith(` \`${tex}\` `);
            } else {
                $(el).replaceWith(` $${tex}$ `);
            }
        } else {
            const katexHtml = $(el).find('.katex-html');
            if (katexHtml.length > 0) katexHtml.remove();
            $(el).replaceWith($(el).text());
        }
    });
}

function processQuestion($, q, index) {
    let output = '';
    const stemElem = $(q).find('.xm-markdown-displayer-wrap');
    let stem = "";
    const codeBlocks = [];

    if (stemElem.length > 0) {
        cleanKatex($, stemElem);
        
        // Code blocks
        stemElem.find('pre').each((i, pre) => {
            const code = $(pre).find('code');
            if (code.length > 0) {
                let lang = 'cpp';
                const classes = code.attr('class') || '';
                const match = classes.match(/language-(\w+)/);
                if (match) lang = match[1];
                
                const codeContent = code.text();
                codeBlocks.push({
                    placeholder: `[[CODE_BLOCK_${i}]]`,
                    block: `\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n`,
                    inline: ` \`${codeContent.trim().replace(/\s+/g, ' ')}\` `
                });
                $(pre).replaceWith(`[[CODE_BLOCK_${i}]]`);
            }
        });

        stem = stemElem.text().trim().replace(/\s+/g, ' ');
        codeBlocks.forEach((item) => {
            stem = stem.replace(item.placeholder, item.block);
        });
    }

    output += `\n${index}), ${stem}\n`;
    output += `{{ select(${index}) }}\n`;

    const radioGroup = $(q).find('.ant-radio-group');
    let isJudgment = false;
    if (radioGroup.length > 0) {
        const options = radioGroup.find('label.ant-radio-wrapper');
        options.each((i, opt) => {
            const val = $(opt).find('input').val();
            if (['正确', '错误', 'true', 'false'].includes(val)) {
                isJudgment = true;
                return false; // break
            }
        });

        if (isJudgment) {
            output += "- true\n- false\n";
        } else {
            options.each((j, opt) => {
                let contentText = "";
                const spaceItems = $(opt).find('.ant-space-item');
                if (spaceItems.length >= 2) {
                    const contentDiv = spaceItems.eq(1);
                    cleanKatex($, contentDiv);
                    contentText = contentDiv.text().trim();
                } else {
                    const radioSpan = $(opt).find('.ant-radio');
                    if (radioSpan.length > 0) radioSpan.remove();
                    cleanKatex($, opt);
                    contentText = $(opt).text().trim().replace(/^[A-Z]\.\s*/, '');
                }
                
                // Restore code blocks in options
                codeBlocks.forEach((item) => {
                    contentText = contentText.replace(item.placeholder, item.inline);
                });
                
                // Trim to ensure no leading newlines (especially from code blocks)
                contentText = contentText.trim();

                const label = String.fromCharCode(65 + j);
                output += `- ${label}. ${contentText}\n`;
            });
        }
    }
    return output;
}

export function parseHtml(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);
    let output = '';

    // Title
    let titleElem = $('.xm-header-name');
    if (titleElem.length === 0) titleElem = $('.exam-problem-title');
    const sectionTitle = titleElem.length > 0 ? titleElem.text().trim() : "题目列表";
    output += `# ${sectionTitle}\n`;

    let globalIndex = 1;
    const problemLists = $('.exam-problem-list');

    if (problemLists.length > 0) {
        problemLists.each((i, pList) => {
            const header = $(pList).find('.exam-problem-header');
            if (header.length > 0) {
                const titleSpan = header.find('.exam-problem-title');
                const scoreSpan = header.find('.exam-problem-score');
                const secTitle = titleSpan.length > 0 ? titleSpan.text().trim() : "部分";
                const secScore = scoreSpan.length > 0 ? scoreSpan.text().trim() : "";
                output += `\n## ${secTitle} ${secScore}\n`;
            }
            $(pList).find('.exam-question-item-ctn').each((j, q) => {
                output += processQuestion($, q, globalIndex++);
            });
        });
    } else {
        $('.exam-question-item-ctn').each((i, q) => {
            output += processQuestion($, q, i + 1);
        });
    }
    return { md: output, title: sectionTitle };
}
