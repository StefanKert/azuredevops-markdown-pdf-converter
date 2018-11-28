import path = require("path");
import fs = require("fs");
import url = require("url");
import hljs = require("highlight.js");
import puppeteer = require("puppeteer-core");
import mustache = require("mustache");
import process = require("process");
import cheerio = require("cheerio");
import markdownit = require("markdown-it");
import Token = require("markdown-it/lib/Token");
import Renderer = require("markdown-it/lib/Renderer");
import Remarkable = require("remarkable");

const tempFilePath: string = path.join(__dirname, "template", "template.html");

export async function executeExportForFile(
  mdfilename: string,
  pdffilename: string,
  covertitle?: string,
  version?: string,
  repository?: string
): Promise<void> {
  var text: string = fs.readFileSync(mdfilename, "utf8");
  var content: string = convertMarkdownToHtml(mdfilename, text);

  if(covertitle && covertitle.length > 0) {
    content = addCoverPage(content, covertitle, version, repository);
  }
  else covertitle = "";

  var html: string = makeHtml(content, mdfilename);
  await exportPdf(html, pdffilename, covertitle);
}

export async function executeExport(
  mdfilename: string,
  text: string,
  pdffilename: string,
  covertitle?: string,
  version?: string,
  repository?: string
): Promise<void> {
  var content: string = convertMarkdownToHtml(mdfilename, text);
  
  if(covertitle && covertitle.length > 0) {
    content = addCoverPage(content, covertitle, version, repository);
  }
  else covertitle = "";
  
  var html: string = makeHtml(content, mdfilename);
  await exportPdf(html, pdffilename, covertitle);
}

function convertMarkdownToHtml(filename: string, text: string): string {
  var md: markdownit = new markdownit({
    html: true,
    breaks: false,
    highlight: (str: string, lang: string) => {
      if (lang && hljs.getLanguage(lang)) {
        str = hljs.highlight(lang, str, true).value;
      } else {
        str = md.utils.escapeHtml(str);
      }
      return "<pre class='hljs'><code><div>" + str + "</div></code></pre>";
    }
  });

  var defaultRender: any = md.renderer.rules.image;
  md.renderer.rules.image = (
    tokens: Token[],
    idx: number,
    options: any,
    env: string,
    self: Renderer
  ) => {
    var token: Token = tokens[idx];
    var href: string = token.attrs[token.attrIndex("src")][1];
    href = convertImgPath(href, filename);
    token.attrs[token.attrIndex("src")][1] = href;
    return defaultRender(tokens, idx, options, env, self);
  };
  md.renderer.rules.html_block = (tokens: Token[], idx: number): string => {
    var html: string = tokens[idx].content;
    var $: CheerioStatic = cheerio.load(html);
    $("img").each(() => {
      var src: string = $(this).attr("src");
      var href: string = convertImgPath(src, filename);
      $(this).attr("src", href);
    });
    return $.html();
  };
  md.use(require("markdown-it-checkbox"));
  md.use(require("markdown-it-named-headers"));
  md.use(require("markdown-it-container"));
  md.use(require("markdown-it-plantuml"));
  md.use(require("markdown-it-anchor"));
  md.use(require("markdown-it-table-of-contents"));
  return md.render(text);
}

function addCoverPage(data: string, title: string, version?: string, repository?: string): string {

  var content: string =
  `<div style="position: absolute;
  top: 40%;
  left: 50%;
  -moz-transform: translateX(-50%) translateY(-50%);
  -webkit-transform: translateX(-50%) translateY(-50%);
  transform: translateX(-50%) translateY(-50%);
  width: 60%";>
  <span style="font-size: 50px; line-height: 50px; width: 100%; display: inline-block; text-align: center;">` + title + `</span>
  <hr>`
  if(repository) {
    content += '<span style="font-size: 15px; width: 100%;display: inline-block; text-align: center;">' + repository + '</span>';
  }
  if(version) {
    content += '<span style="font-size: 15px; width: 100%;display: inline-block; text-align: center;">' + version + '</span>';
  }
  content +=
  `</div>
  <div style="page-break-after: always;"></div>;`

  content += data;
  return content;
}

function makeHtml(data: string, uri: string): string {
  var template: string = fs.readFileSync(tempFilePath, "utf-8");
  var view: any = {
    title: path.basename(uri),
    style: readStyles(),
    content: data
  };
  return mustache.render(template, view);
}

function convertImgPath(src: string, filename: string): string {
  var href: string = decodeURIComponent(src);
  href = href
    .replace(/("|')/g, "")
    .replace(/\\/g, "/")
    .replace(/#/g, "%23");
  var protocol: string = url.parse(href).protocol;
  if (protocol === "file:" && href.indexOf("file:///") !== 0) {
    return href.replace(/^file:\/\//, "file:///");
  } else if (protocol === "file:") {
    return href;
  } else if (!protocol || path.isAbsolute(href)) {
    href = path
      .resolve(path.dirname(filename), href)
      .replace(/\\/g, "/")
      .replace(/#/g, "%23");
    if (href.indexOf("//") === 0) {
      return "file:" + href;
    } else if (href.indexOf("/") === 0) {
      return "file://" + href;
    } else {
      return "file:///" + href;
    }
  } else {
    return src;
  }
}

function readStyles(): string {
  let style: string = "";
  style += fs.readFileSync(
    path.join(__dirname, "styles", "markdown.css"),
    "utf-8"
  );
  style += fs.readFileSync(
    path.join(
      __dirname,
      "styles",
      "github.css"
    ),
    "utf-8"
  );
  style += fs.readFileSync(
    path.join(__dirname, "styles", "markdown-pdf.css"),
    "utf-8"
  );
  return "\n<style>\n" + style + "\n</style>\n";
}

async function exportPdf(data: string, filename: string, covertitle?: string): Promise<void> {
  let f: path.ParsedPath = path.parse(filename);
  var tmpfilename: string = path.join(f.dir, f.name + "_tmp.html");
  fs.writeFileSync(tmpfilename, data, "utf-8");
  let browser: puppeteer.Browser = await puppeteer.launch({
    executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
  });
  let page: puppeteer.Page = await browser.newPage();
  await page.goto(tmpfilename.toString(), { waitUntil: "networkidle0" });

  var options: puppeteer.PDFOptions = {
    path: filename,
    scale: 1,
    displayHeaderFooter: true,
    headerTemplate:
      // tslint:disable-next-line:max-line-length
      "<div style=\"font-size: 9px; margin-left: 1cm;\"> <span>" + covertitle + "</span> </div> <div style=\"font-size: 9px; margin-left: auto; margin-right: 1cm; \"> <span class='date'></span></div>",
    // tslint:disable-next-line:max-line-length
    footerTemplate:
      "<div style=\"font-size: 9px; margin: 0 auto;\"> <span class='pageNumber'></span> / <span class='totalPages'></span></div>",
    printBackground: true,
    landscape: false,
    pageRanges: "",
    format: "A4",
    margin: {
      top: "1.5cm",
      right: "1cm",
      bottom: "1cm",
      left: "1cm"
    }
  };
  await page.pdf(options);
  await browser.close();
}

export function getLinksFromDocument(text: string): any[] {
  let md: Remarkable = new Remarkable();
  let links: any[] = [];
  let tokens: Remarkable.Token[] = md.parse(text, {});

  tokens.forEach(token => {
    if (token.type !== "inline") {
      return;
    }

    let blockContentToken: Remarkable.BlockContentToken = token as Remarkable.BlockContentToken;
    if (blockContentToken == null) {
      return;
    }

    let link: any = {};
    blockContentToken.children.forEach(child => {
      if (child.type === "link_open" && typeof child.href === "string") {
        link.href = child.href;
      } else if (child.type === "text") {
        let titleNode: Remarkable.BlockContentToken = child as Remarkable.BlockContentToken;
        link.title = titleNode.content;
      }
    });
    if (link.href != null && link.title != null) {
      links.push(link);
    }
  });

  return links;
}
