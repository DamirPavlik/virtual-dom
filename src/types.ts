type vNode = | string | {
    type: keyof HTMLElementTagNameMap; 
    props?: { [key: string]: string | ((event: Event) => void) }; 
    children?: vNode[]; 
};

type Patch = | {
    type: "CREATE",
    vNode: vNode,
} | {
    type: "REMOVE",
} | {
    type: "REPLACE",
    vNode: vNode
} | {
    type: "UPDATE",
    props: PropPatch[],
    children: Patch[],
}

type PropPatch = | {
    type: "SET_PROP",
    key: string,
    value: string | ((event: Event) => void)
} | {
    type: "REMOVE_PROP",
    key: string,
}