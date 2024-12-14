type vNode = | string | {
    type: keyof HTMLElementTagNameMap; 
    props?: { [key: string]: string | ((event: Event) => void) }; 
    children?: vNode[]; 
};