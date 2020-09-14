
/**
 * 从根节点开始渲染和调度 两个阶段
 * 
 * diff 阶段 对比新旧的虚拟DOM，进行增量、更新或创建。render 阶段
 *     这个阶段可能比较花时间，所以我们对任务进行拆分，拆分的维度虚拟DOM。此阶段可以暂停
 *     render 阶段的成功时 effect list 知道哪些节点更新、删除、增加
 *     render 阶段有两个任务，1、根据虚拟 DOM 生成 fiber 树 2、收集 effectlist
 * commit 阶段，进行 DOM 更新创建阶段，此阶段不能暂停，要一气呵成
 */

import { TAG_ROOT, ELEMENT_TEXT, TAG_TEXT, TAG_HOST, PLACEMENT } from "./constants";
import { setProps } from './utils';

// 47:28
let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // RootFiber 应用的根
export function scheduleRoot(rootFiber) { // {tag: TAG_ROOT, stateNode: container, props: { children: [element]}}
    workInProgressRoot = rootFiber;
    nextUnitOfWork = rootFiber;
}

function performUnitOfWork(currentFiber) {
    beginWork(currentFiber);
    if (currentFiber.child) {
        return currentFiber.child;
    }

    while (currentFiber) {
        completeUnitOfWork(currentFiber); // 没有 child 让自己完成
        if (currentFiber.sibling) {
            return currentFiber.sibling;
        }
        currentFiber = currentFiber.return; // 找父亲，然后让父亲完成
    }
}

// 在完成的时候要收集有副作用的 fiber，然后组成 effectlist
// 每一个 fiber 有两个属性，firstEffect 指向第一个有副作用的子 fiber，lastEffect 指向最后一个有副作用的子 fiber，中间的用 nextEffect 做成一个单链表
function completeUnitOfWork(currentFiber) {
    let returnFiber = currentFiber.return;
    if (returnFiber) {

        //// 把自己儿子的 effect 链挂在父亲身上
        if (!returnFiber.firstEffect) {
            returnFiber.firstEffect = currentFiber.firstEffect;
        }
        if (currentFiber.lastEffect) {
            if (returnFiber.lastEffect) {
                returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
            }
            returnFiber.lastEffect = currentFiber.lastEffect;
        }

        //// 把自己挂在父亲身上
        const effectTag = currentFiber.effectTag;
        if (effectTag) { // 有副作用
            if (returnFiber.lastEffect) {
                returnFiber.lastEffect.nextEffect = currentFiber;
            } else {
                returnFiber.firstEffect = currentFiber; 
            }
            returnFiber.lastEffect = currentFiber;
        }
    }
}

/**
 * 开始工作
 * 1、创建真实 DOM 元素
 * 2、创建子 fiber
 * @param {*} currentFiber 
 */
function beginWork(currentFiber) {
    if (currentFiber.tag === TAG_ROOT) {
        updateHostRoot(currentFiber);
    } else if (currentFiber.tag === TAG_TEXT) {
        updateHostText(currentFiber);
    } else if (currentFiber.tag === TAG_HOST) {
        updateHost(currentFiber);
    }
}

function updateHost(currentFiber) {
    if (!currentFiber.stateNode) { // 如果没有创建 DOM 节点
        currentFiber.stateNode = createDOM(currentFiber);
    }
    const newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
    if (currentFiber.tag === TAG_TEXT) {
        return document.createTextNode(currentFiber.props.text);
    } else if (currentFiber.tag === TAG_HOST) { // span div
        let stateNode = document.createElement(currentFiber.type);
        updateDOM(stateNode, {}, currentFiber.props);
        return stateNode;
    }
}

function updateDOM(stateNode, oldProps, newProps) {
    setProps(stateNode, oldProps, newProps);
}

function updateHostText(currentFiber) {
    if (!currentFiber.stateNode) { // 如果没有创建 DOM 节点
        currentFiber.stateNode = createDOM(currentFiber);
    }
}

function updateHostRoot(currentFiber) {
    // 先处理自己，如果是一个原生节点，创建真实 DOM 2、创建子 fiber
    let newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren);
}

function reconcileChildren(currentFiber, newChildren) {
    let newChildIndex = 0; // 新子节点索引
    let prevSibling; // 上一个新的子 fiber
    // 遍历创建子 fiber
    while (newChildIndex < newChildren.length) {
        let newChild = newChildren[newChildIndex]; // 取出元素节点
        let tag;
        if (newChild.type === ELEMENT_TEXT) {
            tag = TAG_TEXT; // 文本节点
        } else if (typeof newChild.type === 'string') {
            tag = TAG_HOST; // 如果是字符串，那么是一个原生 DOM 节点
        }
        // beginWork 创建 fiber，在 completeUnitOfWork 的时候收集 effect
        let newFiber = {
            tag,
            type: newChild.type,
            props: newChild.props,
            stateNode: null, // div 还没有创建 DOM 元素
            return: currentFiber,
            effectTag: PLACEMENT, // 副作用标识，render 阶段 我们会收集副作用，增加、删除、更新
            nextEffect: null, // effectlist 也是一个单链表
            // effectlist 顺序和完成顺序是一样的，但是节点可能会少，只放有副作用的
        }
        if (newFiber) {
            if (newChildIndex === 0) {
                currentFiber.child = newFiber;
            } else {
                prevSibling.sibling = newFiber;
            }
            prevSibling = newFiber;
        }
        newChildIndex++;
    }
}

// 循环执行工作 nextUnitWork
function workLoop(deadline) {
    let shouldYield = false; // 是否要让出时间片或者说控制权
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        shouldYield = deadline.timeRemaining() < 1; // 剩余时间小于1，就说明没有时间，让出控制权
    }
    if (!nextUnitOfWork && workInProgressRoot) {
        console.log('render 阶段结束');
        commitRoot();
    }
    console.log('work loop ing')
    // 不管有没有任务，都请求再次调度 每一帧都要执行一个 workloop
    requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
    let currentFiber = workInProgressRoot.firstEffect;
    while (currentFiber) {
        commitWork(currentFiber);
        currentFiber = currentFiber.nextEffect;
    }
    workInProgressRoot = null;
}

function commitWork(currentFiber) {
    if (!currentFiber) return;
    let returnFiber = currentFiber.return;
    let returnDOM = returnFiber.stateNode;
    if (currentFiber.effectTag === PLACEMENT) {
        returnDOM.appendChild(currentFiber.stateNode);
    }
    currentFiber.effectTag = null;
}

// react 告诉浏览器，我现在有任务请你在闲的时候，
requestIdleCallback(workLoop, { timeout: 500 });