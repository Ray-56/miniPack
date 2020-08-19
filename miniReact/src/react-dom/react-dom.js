let isFirstRender = false;
let HostRoot = 'HostRoot'; // RootFiber 类型
let ClassComponent = 'ClassComponent'; // 表示类组件的类型
let HostComponent = 'HostComponent'; // 表示原生 Dom 类型
let HostText = 'HostText'; // 表示文本类型

let NoWork = 'NoWork'; // 表示当前节点没有任何工作
let Placement = 'Placement'; // 表示这个节点是新插入的
let Update = 'Update'; // 表示当前节点有更新
let Deletion = 'Deletion'; // 表示当前节点要被删除
let PlacementAndUpdate = 'PlacementAndUpdate'; // 一般是节点换位置同时更新

let nextUnitOfWork = null;

class FiberNode {
    constructor(tag, key, pendingProps) {
        this.tag = tag; // 当前 fiber 的类型
        this.key = key;
        this.type = null; // 'div' | 'h2' | Kang
        this.stateNode = null; // 当前 fiber 的实例
        this.child = null; // 当前 fiber 的子节点
        this.sibling = null; // 当前 fiber 的兄弟节点
        this.return = null; // 当前 fiber 的父节点
        this.index = 0;
        this.memoizedState = null; // 当前 fibre 的 state
        this.memoizedProps = null; // 当前 fiber 的 props
        this.pendingProps = pendingProps; // 表示新进来的 props
        this.effectTag = NoWork; // 表示当前节点要进行何种更新
        this.firstEffect = null; // 当前节点的有更新的第一个子节点
        this.lastEffect = null; // 当前节点的有更新的最后一个子节点
        this.nextEffect = null; // 表示下一个要更新的子节点

        this.alternate = null; // 用来连接 current 和 workInProgress
        this.updateQueue = null; // 一条链表，上面挂载当前 fiber 的新的状态
        // 其实还有很多其他属性
        // expirationTime: 0;
    }
}

function createFiber(tag, key, pendingProps) {
    return new FiberNode(tag, key, pendingProps);
}

function createWorkInProgress(current, pendingProps) {
    // 复用 current.alternate
    let workInProgress = current.alternate;
    if (!workInProgress) {
        workInProgress = createFiber(current.tag, pendingProps, current.key);
        workInProgress.type = current.type;
        workInProgress.stateNode = current.type;
        // 要让这两个相互指向
        workInProgress.alternate = current;
        current.alternate = workInProgress;
    } else {
        workInProgress.pendingProps = pendingProps;
        workInProgress.effectTag = NoWork;
        workInProgress.firstEffect = null;
        workInProgress.lastEffect = null;
        workInProgress.nextEffect = null;
    }

    // 要保证 current 和 current.alternate 上的 updateQueue 是同步的
    /*
        因为 每次执行 setState 时候会创建新的更新 把更新挂载到组件对应的 fiber 上
        这个 fiber 在奇数次更新时 存在于 current 树上，偶数次更新时存在于 current.alternate
        咱们每次创建（或复用）workInProgress 是从 current.alternate 上拿的对象
        复用的这个 alternate 上 updateQueue 上不一定有新的更新
        所以这里要判断如果 current.alternate 上没有新的更新的话，就说明本轮更新找到的这个 fiber 存在于 current 树上

        源码中没有这个判断
        在执行 createWorkInProgress 之前调用了一个 enqueueUpdate 方法
        这个方法将 fiber 和 current.alternate 上的 updateQueue的新状态，进行了同步
    */
    if (
        !!workInProgress &&
        !!workInProgress.updateQueue &&
        !!workInProgress.updateQueue.lastUpdate
    ) {
        workInProgress.updateQueue = current.updateQueue;
    }

    workInProgress.child = current.child;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    return workInProgress;
}

function beginWork(workInProgress) {
    let next

    return next;
}

function completeUnitOfWork(workInProgress) {
    while (true) {
        let retrunFiber = workInProgress.return;
        let siblingFiber = workInProgress.sibling;


        if (!!siblingFiber) return siblingFiber;
        if (!!retrunFiber) {
            workInProgress = retrunFiber;
            continue;
        }
    }
}

function performUnitOfWork(workInProgress) {
    let next = beginWork(workInProgress);

    if (next === null) {
        next = completeUnitOfWork(workInProgress);
    }

    return next;
}

function workLoop(nextUnitOfWork) {
    while (!!nextUnitOfWork) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }
}

class ReactRoot {
    constructor(container) {
        this._internalRoot = this._createRoot(container);
    }
    _createRoot(container) {
        let uninitialFiber = this._createUninitialFiber(HostRoot, null, null);

        let root = {
            container,
            current: uninitialFiber,
            finishedWork: null,
        }

        uninitialFiber.stateNode = root;
        return root;
    }
    render(reactElement, callback) {
        let root = this._internalRoot;

        let workInProgress = createWorkInProgress(root.current, null);

        workInProgress.memoizedState = { element: reactElement };

        nextUnitOfWork = workInProgress;
        workLoop(nextUnitOfWork);
    }
}

const ReactDOM = {
    render(reactElement, container, callback) {
        isFirstRender = true;
        let root = new ReactRoot(container);

        container._reactRootContainer = root;

        root.render(reactElement, callback);


        isFirstRender = false;
    }
}

export default ReactDOM