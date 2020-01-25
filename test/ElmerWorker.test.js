require("mocha");
var assert = require("chai").assert;

var { JSDOM } = require("jsdom")
var jsDom = new JSDOM("<html><head></head><body></body></html>");
var Common = require("elmer-common").Common;
var com = new Common();
// global = jsDom.window;
com.extend(global, jsDom.window);
// global.Blob = jsDom.window.Blob;

var ElmerWorker = require("../lib").ElmerWorker;

describe("ElmerWorker testting", () => {
    describe("Create ElmerWorker Testting", () => {
        it("Init worker", () => {
            var worker = new ElmerWorker();
            // assert.equal(typeof worker, "object");
        });
    });
});