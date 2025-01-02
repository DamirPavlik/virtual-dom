# Virtual DOM Patch Engine

This project is a lightweight Virtual DOM implementation that supports creating DOM elements from a virtual node tree, diffing two virtual node trees to compute patches, and applying those patches to the real DOM. It provides a framework for efficiently updating the DOM in response to changes in application state.

## Features

- **Virtual DOM Creation**: Build virtual DOM trees using JavaScript objects.
- **Diffing Algorithm**: Compute minimal differences (patches) between two virtual DOM trees.
- **Patch Application**: Apply the computed patches to update the real DOM.
- **Levenshtein Distance**: Used to optimize the reordering of non-keyed children.
- **Event Handling**: Supports binding event listeners specified in virtual DOM nodes.

## File Structure

- **Core Functions**:
  - `createElement(vNode)`: Converts a virtual node into a real DOM element.
  - `diff(oldVNode, newVNode)`: Computes the differences (patches) between two virtual DOM trees.
  - `enqueuePatch(parent, patches)`: Queues patches for application.
  - `applyPatch(parent, patches, index)`: Applies a single patch to the DOM.
  - `applyProps(element, props)`: Updates the properties of a DOM element.
- **Helpers**:
  - `levenshtein(a, b)`: Computes the Levenshtein distance matrix for child reordering.
  - `backtrackChanges(dp, a, b)`: Extracts changes from the distance matrix.
  - `diffProps(oldProps, newProps)`: Computes property differences.
  - `diffChildren(oldChildren, newChildren)`: Computes differences between child nodes.
- **Utilities**:
  - `setDocument(doc)`: Allows setting a custom document object for environments without a DOM.

## Example Usage

```typescript
const oldVNode: vNode = {
    type: "div",
    props: { class: "container" },
    children: [
        { type: "h1", props: { class: "title" }, children: ["Old Title"] },
        { type: "p", props: {}, children: ["This is old content."] },
    ],
};

const newVNode: vNode = {
    type: "div",
    props: { class: "container" },
    children: [
        { type: "h1", props: { class: "title" }, children: ["New Title"] },
        { type: "p", props: {}, children: ["This is updated content."] },
        { type: "p", props: { class: "new" }, children: ["This is a new paragraph."] },
    ],
};

setDocument(globalThis.document || { 
    createElement: () => {}, 
    createTextNode: () => {}, 
    createDocumentFragment: () => {} 
});

const parent = createElement(oldVNode);
console.log("Initial DOM:", parent);

const patches = diff(oldVNode, newVNode);
console.log("Computed patches:", patches);

enqueuePatch(parent as Node, patches);
```
