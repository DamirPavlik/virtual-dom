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

    (vNode.children || []).forEach(child => {
        element.appendChild(createElement(child));
    })

    return element;
}