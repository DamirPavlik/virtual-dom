const vNode: vNode = {
    type: "div",
    props: {
        "id": "something"
    },
    children: [
        {
            type: "h1",
            props: {},
            children: ["Hello World"]
        },
        {
            type: "p",
            props: {},
            children: ["Virtual DOM"]
        },
    ]
}

let globalDocument:any = typeof document !== "undefined" ? document : null;

function setDocument(doc: any) {
  globalDocument = doc;
}

function createElement(vNode: any) {
  if (typeof vNode === "string") {
    return globalDocument.createTextNode(vNode);
  }

  const element = globalDocument.createElement(vNode.type);
  if (vNode.props) {
    for (const [k, v] of Object.entries(vNode.props)) {
      if (typeof v === "function") {
        element.addEventListener(k, v);
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

function diffProps(oldProps: { [key: string]: string | ((event: Event) => void)}, newProps: { [key: string]: string | ((event: Event) => void) }): PropPatch[] {
    const patches: PropPatch[] = [];

    for (const [k,v] of Object.entries(newProps)) {
        if (oldProps[k] !== k) {
            patches.push({
                type: "SET_PROP",
                key: k,
                value: v,
            });
        }
    }

    for (const k in oldProps) {
        if (!(k in newProps)) {
            patches.push({
                type: "REMOVE_PROP",
                key: k,
            });
        }
    }

    return patches;
}

function diffChildren(oldChildren: vNode[] = [], newChildren: vNode[] = []): Patch[] {
    const patches: Patch[] = [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; ++i) {
        patches.push(diff(oldChildren[i], newChildren[i]));
    }

    return patches;
}

function patch(parent: Node, patches: Patch, index: number = 0): void {
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
            patch(child, childPatch, i);
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

export { createElement, diff, patch, applyProps, setDocument };