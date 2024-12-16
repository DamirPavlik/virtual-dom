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

function createElement(vNode: vNode): Node {
    if (typeof vNode === "string") {
        return document.createTextNode(vNode);
    }

    let element = document.createElement(vNode.type);

    if (vNode.props) {
        for(const [k, v] of Object.entries(vNode.props)) {
            if (typeof v === "function") {
                element.addEventListener(k, v as EventListener);
            } else {
                element.setAttribute(k, v);
            }
        }
    }
    
    if (vNode.children) {
        vNode.children.forEach(child => {
            element.appendChild(createElement(child));
        })
    }

    return element;
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