const { JSDOM } = require("jsdom");
const { createElement, setDocument, diff, enqueuePatch } = require("../index");
const fs = require("fs");

if (typeof requestAnimationFrame === "undefined") {
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
}

function performanceTest() {
    const { document } = new JSDOM(`<!DOCTYPE html><body></body>`).window;
    setDocument(document); 

    const iterations = 10000;

    const oldVNode = {
        type: "div",
        props: { id: "root" },
        children: Array.from({ length: 10000 }, (_, i) => ({
        type: "p",
        props: { class: "item" + i },
        children: [`Item ${i}`],
        })),
    };

    const newVNode = {
        type: "div",
        props: { id: "root" },
        children: Array.from({ length: 10000 }, (_, i) => ({
        type: "p",
        props: { class: "item" + i },
        children: [`Updated Item ${i}`],
        })),
    };

    const container = document.createElement("div");
    document.body.appendChild(container);

    const oldDom = createElement(oldVNode);
    container.appendChild(oldDom);

    let totalDiffTime: bigint = BigInt(0);
    let totalPatchTime: bigint = BigInt(0);

    for (let i = 0; i < iterations; i++) {
        const diffStart = process.hrtime.bigint();
        const patches = diff(oldVNode, newVNode);
        const diffEnd = process.hrtime.bigint();

        const patchStart = process.hrtime.bigint();
        enqueuePatch(container, patches);
        const patchEnd = process.hrtime.bigint();
        
        console.log(i);

        totalDiffTime += diffEnd - diffStart;
        totalPatchTime += patchEnd - patchStart;
    }

    const averageDiffTime = (totalDiffTime / BigInt(iterations)).toString();
    const averagePatchTime = (totalPatchTime / BigInt(iterations)).toString();

    const result = `Run at ${new Date().toISOString()}:\nAverage diff time: ${averageDiffTime} ns\nAverage patch time: ${averagePatchTime} ns\n\n`;
    fs.appendFileSync("performance.txt", result, "utf8"); 
    console.log("Performance results appended to performance.txt");
}

performanceTest();
