import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import converter = require("./converter");

async function run(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));
    const mdfilename:string = tl.getInput("mdfilename", true);
    const pdffilename:string = tl.getInput("pdffilename", true);

    converter.executeExport(mdfilename, pdffilename);
  } catch (err) {
    console.error(err);
    tl.setResult(tl.TaskResult.Failed, err);
  }
}

run();