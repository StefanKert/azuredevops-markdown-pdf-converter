import ma = require("azure-pipelines-task-lib/mock-answer");
import tmrm = require("azure-pipelines-task-lib/mock-run");
import path = require("path");

let taskPath: string = path.join(__dirname, "..", "index.js");
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput("mdfilename", path.join(__dirname,"TestFile.md"));
tmr.setInput("pdffilename", path.join(__dirname,"TestFile.pdf"));
tmr.setInput("covertitle", "TestCover");
tmr.setInput("version", "18332.6013");
tmr.setInput("repository", "https://dev.azure.com/ouraccount/_git/OurProject");

tmr.run();