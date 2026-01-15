import { load } from 'cheerio';
import fs from 'fs';
import { processSingleImage } from '../cosUploader.js';

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

async function processImages($, elem) {
    if (!elem) return;

    const imageElements = [];

    // 收集所有图片元素
    $(elem).find('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
            imageElements.push({ el, src });
        }
    });

    // 并行上传所有图片到 COS
    if (imageElements.length > 0) {
        console.log(`开始上传 ${imageElements.length} 张图片到 COS...`);
        for (let i = 0; i < imageElements.length; i++) {
            const { el, src } = imageElements[i];
            const cosUrl = await processSingleImage(src, i);
            // 替换为 Markdown 格式
            $(el).replaceWith(` ![图片](${cosUrl}) `);
        }
        console.log(`图片上传完成`);
    }
}

async function processQuestion($, q, index) {
    let output = '';
    const stemElem = $(q).find('.xm-markdown-displayer-wrap');
    let stem = "";
    const codeBlocks = [];

    if (stemElem.length > 0) {
        cleanKatex($, stemElem);
        await processImages($, stemElem);
        
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
            for (let j = 0; j < options.length; j++) {
                const opt = options.eq(j);
                let contentText = "";
                const spaceItems = $(opt).find('.ant-space-item');
                if (spaceItems.length >= 2) {
                    const contentDiv = spaceItems.eq(1);
                    cleanKatex($, contentDiv);
                    await processImages($, contentDiv);
                    contentText = contentDiv.text().trim();
                } else {
                    const radioSpan = $(opt).find('.ant-radio');
                    if (radioSpan.length > 0) radioSpan.remove();
                    cleanKatex($, opt);
                    await processImages($, opt);
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
            }
        }
    }
    return output;
}

export async function parseHtml(htmlPath) {
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
        for (let i = 0; i < problemLists.length; i++) {
            const pList = problemLists.eq(i);
            const header = $(pList).find('.exam-problem-header');
            if (header.length > 0) {
                const titleSpan = header.find('.exam-problem-title');
                const scoreSpan = header.find('.exam-problem-score');
                const secTitle = titleSpan.length > 0 ? titleSpan.text().trim() : "部分";
                const secScore = scoreSpan.length > 0 ? scoreSpan.text().trim() : "";
                output += `\n## ${secTitle} ${secScore}\n`;
            }
            const questions = $(pList).find('.exam-question-item-ctn');
            for (let j = 0; j < questions.length; j++) {
                const q = questions.eq(j);
                const questionOutput = await processQuestion($, q, globalIndex++);
                output += questionOutput;
            }
        };
    } else {
        const questions = $('.exam-question-item-ctn');
        for (let i = 0; i < questions.length; i++) {
            const q = questions.eq(i);
            const questionOutput = await processQuestion($, q, i + 1);
            output += questionOutput;
        }
    }
    return { md: output, title: sectionTitle };
}
