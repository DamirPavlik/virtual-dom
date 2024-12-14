type vNode = {
    type: keyof HTMLElementTagNameMap;
    props?: {[key: string]: string},
    children?: (vNode | string)[],
}