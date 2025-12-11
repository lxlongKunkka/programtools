import { marked } from 'marked';

const text = '# Hello\n\n**World**';
console.log(marked(text));
console.log(marked.parse(text));
