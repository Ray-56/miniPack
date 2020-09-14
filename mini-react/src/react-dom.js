import { TAG_ROOT } from './constants';
import { scheduleRoot } from './schedule';

function render(element, container) {
    let rootFiber = {
        tag: TAG_ROOT, // 每个 fiber 会有一个 tag 标识，元素的类型
        stateNode: container, // 一般情况下如果这个元素是一个原生节点的话，stateNode 指向真是 DOM 元素
        // props.children 是一个数组，里面放的是 React 元素（虚拟 DOM）后面会根据每个 React 元素创建对应的 Fiber
        props: { children: [element]}, // children 内放的是要渲染的元素
    }
    scheduleRoot(rootFiber);
}

const ReactDOM = {
    render
}

export default ReactDOM;