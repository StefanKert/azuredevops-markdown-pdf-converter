import path = require("path");
import fs = require("fs");
import url = require("url");
import hljs = require("highlight.js");
import puppeteer = require("puppeteer");
import mustache = require("mustache");
import process = require("process");
import cheerio = require("cheerio");
import markdownit = require("markdown-it");
import Token = require("markdown-it/lib/Token");
import Renderer = require("markdown-it/lib/Renderer");

const tempFilePath:string = path.join(__dirname, "template", "template.html");

export async function executeExport(mdfilename: string, pdffilename: string): Promise<void> {
    var text:string = fs.readFileSync(mdfilename, "utf8");
    var content:string = convertMarkdownToHtml(mdfilename, text);
    var html:string = makeHtml(content, mdfilename);
    await exportPdf(html, pdffilename);
}

async function exportPdf(data: string, filename: string): Promise<void> {
    let f:path.ParsedPath = path.parse(filename);
    var tmpfilename:string = path.join(f.dir, f.name + "_tmp.html");
    fs.writeFileSync(tmpfilename, data, "utf-8");
    let browser: puppeteer.Browser = await puppeteer.launch();
    let page: puppeteer.Page = await browser.newPage();
    await page.goto(tmpfilename.toString(), { waitUntil: "networkidle0" });

    var options:puppeteer.PDFOptions = {
        path: filename,
        scale: 1,
        displayHeaderFooter: true,
        // tslint:disable-next-line:max-line-length
        headerTemplate: "<div style=\"font-size: 9px; margin-left: 1cm;\"> <span class='title'></span></div> <div style=\"font-size: 9px; margin-left: auto; margin-right: 1cm; \"> <span class='date'></span></div>",
        // tslint:disable-next-line:max-line-length
        footerTemplate: "<div style=\"font-size: 9px; margin: 0 auto;\"> <span class='pageNumber'></span> / <span class='totalPages'></span></div>",
        printBackground: true,
        landscape: false,
        pageRanges: "",
        format:  "A4",
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

function convertMarkdownToHtml(filename:string, text:string):string {
    var md:markdownit = new markdownit({
        html: true,
        breaks: false,
        highlight: (str:string, lang:string) => {
            if (lang && hljs.getLanguage(lang)) {
                str = hljs.highlight(lang, str, true).value;
            } else {
                str = md.utils.escapeHtml(str);
            }
            return "<pre class='hljs'><code><div>" + str + "</div></code></pre>";
        }
    });

    var defaultRender:any = md.renderer.rules.image;
    md.renderer.rules.image = (tokens: Token[], idx: number, options: any, env: string, self: Renderer) => {
        var token:Token = tokens[idx];
        var href:string = token.attrs[token.attrIndex("src")][1];
        href = convertImgPath(href, filename);
        token.attrs[token.attrIndex("src")][1] = href;
        return defaultRender(tokens, idx, options, env, self);
    };
    md.renderer.rules.html_block = (tokens: Token[], idx: number):string => {
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
    return md.render(text);
}

function makeHtml(data: string, uri: string): string {
    var template: string = fs.readFileSync(tempFilePath, "utf-8");
    var view:any = {
      title: path.basename(uri),
      style: readStyles(),
      content: data
    };
    return mustache.render(template, view);
}

function convertImgPath(src: string, filename: string): string {
    var href: string = decodeURIComponent(src);
    href = href.replace(/("|')/g, "")
          .replace(/\\/g, "/")
          .replace(/#/g, "%23");
    var protocol: string = url.parse(href).protocol;
    if (protocol === "file:" && href.indexOf("file:///") !==0) {
      return href.replace(/^file:\/\//, "file:///");
    } else if (protocol === "file:") {
      return href;
    } else if (!protocol || path.isAbsolute(href)) {
      href = path.resolve(path.dirname(filename), href).replace(/\\/g, "/")
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
    let style:string = "";
    style += fs.readFileSync(path.join(__dirname, "styles", "markdown.css"), "utf-8");
    style += fs.readFileSync(path.join(__dirname, "node_modules", "highlight.js", "styles", "github.css"), "utf-8");
    style += fs.readFileSync(path.join(__dirname, "styles", "markdown-pdf.css"), "utf-8");
    return "\n<style>\n" + style + "\n</style>\n";
}