import path = require("path");
import fs = require("fs");
import tl = require("azure-pipelines-task-lib/task");
import converter = require("./converter");
import parse = require("parse-markdown-links");
import Remarkable = require("remarkable");
import os = require("os");

async function run(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));
    const mdfilename: string = tl.getInput("mdfilename", true);
    const pdffilename: string = tl.getInput("pdffilename", true);
    const generatetoc: boolean = tl.getBoolInput("generatetoc", false);

    if (mdfilename.endsWith("index.md")) {
      var indexFileContent: string = fs.readFileSync(mdfilename, "utf-8");
      var baseFolder: string = path.dirname(mdfilename);
      var links: any[] = converter.getLinksFromDocument(indexFileContent);
      var contents: string[] = [];
      if (generatetoc) {
        contents.push(`${path.basename(baseFolder)}

        [[toc]]
        <div style="page-break-after: always;"></div>
        `);
      } else {
        links.forEach(link => {
          indexFileContent = indexFileContent.replace(link.href, "#" + link.href);
        });
        contents.push(`${indexFileContent}
<div style="page-break-after: always;"></div>
`);
      }

      links.forEach(link => {
        var filePath: string = path.join(baseFolder, link.href);
        if (!fs.existsSync(filePath)) {
          console.log("File not exists: " + filePath); // todo: Warning
        } else {
          if (generatetoc) {
            contents.push(`${fs.readFileSync(filePath, "utf-8")}
<div style='page-break-after: always;'></div>`);
          } else {
            contents.push(`<a name="${link.href}"></a>
${fs.readFileSync(filePath, "utf-8")}
<div style='page-break-after: always;'></div>
`);
          }
        }
      });
      let mergedContent: string = contents.join(os.EOL);
      await converter.executeExport(mdfilename, mergedContent, pdffilename);
    } else {
      await converter.executeExportForFile(mdfilename, pdffilename);
    }
  } catch (err) {
    console.error(err);
    tl.setResult(tl.TaskResult.Failed, err);
  }
}

run();
