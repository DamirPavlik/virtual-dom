const { JSDOM } = require("jsdom");
const { createElement, setDocument, diff, patch } = require("../index");
const fs = require("fs");

function performanceTest() {
  const { document } = new JSDOM(`<!DOCTYPE html><body></body>`).window;
  setDocument(document); // Set the global document for the virtual DOM functions.

  const iterations = 1000;

  const oldVNode = {
    type: "div",
    props: { id: "root" },
    children: Array.from({ length: 1000 }, (_, i) => ({
      type: "p",
      props: { class: "item" + i },
      children: [`Item ${i}`],
    })),
  };

  const newVNode = {
    type: "div",
    props: { id: "root" },
    children: Array.from({ length: 1000 }, (_, i) => ({
      type: "p",
      props: { class: "item" + i },
      children: [`Updated Item ${i}`],
    })),
  };

  const container = document.createElement("div");
  document.body.appendChild(container);

  const oldDom = createElement(oldVNode);
  container.appendChild(oldDom);

  let totalDiffTime = 0;
  let totalPatchTime = 0;

  for (let i = 0; i < iterations; i++) {
    const diffStart = performance.now();
    const patches = diff(oldVNode, newVNode);
    const diffEnd = performance.now();

    const patchStart = performance.now();
    patch(container, patches);
    const patchEnd = performance.now();

    totalDiffTime += diffEnd - diffStart;
    totalPatchTime += patchEnd - patchStart;
  }

  const averageDiffTime = (totalDiffTime / iterations).toFixed(2);
  const averagePatchTime = (totalPatchTime / iterations).toFixed(2);

  const result = `Average diff time: ${averageDiffTime} ms\nAverage patch time: ${averagePatchTime} ms\n`;
  fs.writeFileSync("performance.txt", result, "utf8");
  console.log("Performance results written to performance.txt");
}

performanceTest();
