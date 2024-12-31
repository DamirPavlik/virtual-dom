let globalDocument:any = typeof document !== "undefined" ? document : null;
let patchQueue: {parent: Node; patches: Patch; index: number}[] = [];
let isProcessing = false;

function setDocument(doc: any) {
    globalDocument = doc;
}

function createElement(vNode: vNode) {
    if (typeof vNode === "string") {
        return globalDocument.createTextNode(vNode);
    }

    if (vNode.type === "Fragment") {
        const fragment = globalDocument.createDocumentFragment();
        vNode.children?.forEach((child: any) => {
            fragment.appendChild(createElement(child));
        });
        return fragment;
    }

    const element = globalDocument.createElement(vNode.type);

    if (vNode.props) {
        for (const [k, v] of Object.entries(vNode.props)) {
            if (typeof v === "function" && k.startsWith("on")) {
                const eventType = k.slice(2).toLowerCase();
                element.addEventListener(eventType, (e: Event) => {
                    if (e.target === element) {
                        v(e);
                    }
                })
            } else {
                element.setAttribute(k, v);
            }
        }
    }

    if (vNode.children) {
        vNode.children.forEach((child: any) => {
            element.appendChild(createElement(child));
        });
    }

    return element;
}

function levenshtein(a: vNode[], b:vNode[]): number[][] {
    const m = a.length;
    const n = b.length;

    const dp: number[][] = Array.from({length: m + 1}, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; ++i) dp[i][0] = i;
    for (let j = 0; j <= n; ++j) dp[0][j] = j;

    for (let i = 1; i <= m; ++i) {
        for (let j = 1; j <= n; ++j) {
            if (areNodesEqual(a[i - 1], b[j - 1])) {
                dp[i][j] = dp[i -  1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + 1
                );
            }
        }
    }

    return dp;
}

function areNodesEqual(a: vNode, b: vNode): boolean {
    if (typeof a === "string" || typeof b === "string") {
        return a === b;
    }
    return a.type === b.type && JSON.stringify(a.props) === JSON.stringify(b.props);
}

function backtrackChanges(dp: number[][], a: vNode[], b: vNode[]): Patch[] {
    const changes: Patch[] = [];
    let i = a.length;
    let j = b.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && areNodesEqual(a[i - 1], b[j - 1])) {
            i--; j--;
        } else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
            changes.push({type: "REMOVE"});
            i--;
        } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j-1] + 1)) {
            changes.push({type: "CREATE", vNode: b[j - 1]});
            j--;
        } else {
            changes.push({type: "REPLACE", vNode: b[j - 1]});
            i--;
            j--;
        }
    }

    return changes.reverse();
}

function diff(oldVNode: vNode | undefined, newVNode: vNode | undefined): Patch { 
    if (!oldVNode) {
        return {
            type: "CREATE",
            vNode: newVNode!
        }
    }

    if (!newVNode) {
        return {
            type: "REMOVE",
        }
    }

    if (typeof oldVNode === typeof newVNode) {
        return {
            type: "REPLACE",
            vNode: newVNode,
        }
    }

    if (typeof oldVNode === "string" && oldVNode !== newVNode) {
        return {
            type: "REPLACE",
            vNode: newVNode,
        }
    }

    if (typeof oldVNode !== "string" && oldVNode.type !== (newVNode as Exclude<vNode, string>).type) {
        return {
            type: "REPLACE",
            vNode: newVNode,
        }
    }

    if (typeof oldVNode !== "string" && typeof newVNode !== "string") {
        const propsDiff = diffProps(oldVNode.props || {}, newVNode.props || {});
        const childrenDiff = diffChildren(oldVNode.children || [], newVNode.children || []);
        
        return {
            type: "UPDATE",
            props: propsDiff,
            children: childrenDiff
        }
    }

    return {
        type: "UPDATE",
        props: [],
        children: []
    }
}

function diffProps(oldProps: Record<string, any>, newProps: Record<string, any>): PropPatch[] {
    const patches: PropPatch[] = [];

    for (const [k, v] of Object.entries(newProps)) {
        if (oldProps[k] !== v) {
            patches.push({type: "SET_PROP", key: k, value: v});
        }
    }

    for (const k in oldProps) {
        if (!(k in newProps)) {
            patches.push({type: "REMOVE_PROP", key: k});
        }
    }

    return patches;
}

function diffChildren(oldChildren: vNode[] = [], newChildren: vNode[] = []): Patch[] {
    const oldKeyed = new Map<string, { child: vNode; index: number }>(
        oldChildren.map((child, i) => [
            typeof child !== "string" && child.key ? child.key : i.toString(),
            { child, index: i }
        ])
    );

    const newKeyed = new Map<string, { child: vNode; index: number }>(
        newChildren.map((child, i) => [
            typeof child !== "string" && child.key ? child.key : i.toString(),
            { child, index: i }
        ])
    );

    const patches: Patch[] = [];

    newChildren.forEach((newChild, newIndex) => {
        const key = typeof newChild !== "string" && newChild.key ? newChild.key : newIndex.toString();

        if (oldKeyed.has(key)) {
            const { child: oldChild } = oldKeyed.get(key)!;
            patches.push(diff(oldChild, newChild));
            oldKeyed.delete(key);
        } else {
            patches.push({ type: "CREATE", vNode: newChild });
        }
    });

    oldKeyed.forEach(({ child }) => {
        patches.push({ type: "REMOVE" });
    });

    const oldNonKeyed = oldChildren.filter((child) => typeof child !== "string" && !child.key);
    const newNonKeyed = newChildren.filter((child) => typeof child !== "string" && !child.key);

    if (oldNonKeyed.length > 0 || newNonKeyed.length > 0) {
        const dp = levenshtein(oldNonKeyed, newNonKeyed);
        const reorderingPatches = backtrackChanges(dp, oldNonKeyed, newNonKeyed);
        patches.push(...reorderingPatches);
    }

    return patches;
}

function enqueuePatch(parent: Node, patches: Patch, index: number = 0): void {
    patchQueue.push({ parent, patches, index });
    if (!isProcessing) {
        isProcessing = true;
        requestAnimationFrame(() => {
            processPatchQueue();
            isProcessing = false;
        });
    }
}

function processPatchQueue(): void { 
    while (patchQueue.length > 0) {
        const { parent, patches, index} = patchQueue.shift()!;
        applyPatch(parent, patches, index);
    }
}

function applyPatch(parent: Node, patches: Patch, index: number = 0): void {
    if (!patches) {
        return;
    }

    const child = parent.childNodes[index] as HTMLElement;

    if (patches.type === "CREATE") {
        parent.appendChild(createElement(patches.vNode));
    }

    if (patches.type === "REMOVE") {
        parent.removeChild(child);
    }

    if (patches.type === "REPLACE") {
        parent.replaceChild(createElement(patches.vNode), child);
    }

    if (patches.type === "UPDATE") {
        applyProps(child, patches.props);
        patches.children.forEach((childPatch, i) => {
            enqueuePatch(child, childPatch, i);
        });
    }
}

function applyProps(element: HTMLElement, props: PropPatch[]): void {
  props.forEach((patch) => {
    const { type, key } = patch;

    if (type === 'SET_PROP') {
      const { value } = patch;
      if (typeof value === 'function') {
        element.addEventListener(key, value); 
      } else {
        element.setAttribute(key, value); 
      }
    } else if (type === 'REMOVE_PROP') {
      element.removeAttribute(key);
    }
  });
}

export { createElement, diff, enqueuePatch, applyProps, setDocument };

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

// Set a mock document if not running in a browser
setDocument(globalThis.document || { createElement: () => {}, createTextNode: () => {}, createDocumentFragment: () => {} });

// Create the initial DOM element
const parent = createElement(oldVNode);
console.log("Initial DOM:", parent);

// Compute the diff and apply patches
const patches = diff(oldVNode, newVNode);
console.log("Computed patches:", patches);

enqueuePatch(parent as Node, patches);