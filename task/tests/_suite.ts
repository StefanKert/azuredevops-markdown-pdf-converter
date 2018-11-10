import * as path from "path";
import * as assert from "assert";
import * as ttm from "azure-pipelines-task-lib/mock-test";

// tslint:disable-next-line:typedef
describe("Sample task tests", function () {
    this.timeout(30000);

    it("should succeed with simple inputs", (done: MochaDone) => {
        let tp: string = path.join(__dirname, "success.js");
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();
        console.log(tr.stdout);
        console.log(tr.stderr);

        assert.equal(tr.succeeded, true, "should have succeeded");
        assert.equal(tr.warningIssues.length, 0, "should have no warnings");
        assert.equal(tr.errorIssues.length, 0, "should have no errors");
 
        done();
    });

    it("it should fail if tool returns 1", (done: MochaDone) => {
        let tp: string = path.join(__dirname, "failure.js");
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();
        assert.equal(tr.succeeded, false, "should have failed");
        assert.equal(tr.warningIssues, 0, "should have no warnings");
        assert.equal(tr.errorIssues.length, 1, "should have 1 error issue");
        assert.equal(tr.errorIssues[0], "Error: Input required: mdfilename", "error issue output");
        done();
    });
});