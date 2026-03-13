import { load } from "cheerio"
const html = `<td class="col--problem col--problem-name"><a href="/p/35353?tid=abc123"><b>A</b>Pie Progress</a><ul class="problem__tags"><li class="problem__tag"><a class="problem__tag-link" href="/p?q=x">贪心</a></li></ul></td>`
const $ = load(`<table><tbody><tr>${html}</tr></tbody></table>`)
$("a[href]").each((_, el) => {
  const href = $(el).attr("href") || ""
  const m = href.match(/^\/p\/([a-zA-Z0-9_]+)\?tid=([a-zA-Z0-9]+)$/)
  if (!m) return
  const $td = $(el).closest("td")
  const tags = []
  $td.find("a.problem__tag-link").each((_, t) => tags.push($(t).text().trim()))
  console.log("td len:", $td.length, "tags:", JSON.stringify(tags))
})
