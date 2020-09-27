/**
 * 从根节点开始渲染和调度 两个阶段
 *
 * diff 阶段 对比新旧的虚拟DOM，进行增量、更新或创建。render 阶段
 *     这个阶段可能比较花时间，所以我们对任务进行拆分，拆分的维度虚拟DOM。此阶段可以暂停
 *     render 阶段的成功时 effect list 知道哪些节点更新、删除、增加
 *     render 阶段有两个任务，1、根据虚拟 DOM 生成 fiber 树 2、收集 effectlist
 * commit 阶段，进行 DOM 更新创建阶段，此阶段不能暂停，要一气呵成
 */

import {
	TAG_ROOT,
	ELEMENT_TEXT,
	TAG_TEXT,
	TAG_HOST,
	PLACEMENT,
	DELETION,
	UPDATE,
	TAG_CLASS,
	TAG_FUNCTION_COMPONENT,
} from "./constants";
import { Update, UpdateQueue } from "./UpdateQueue";
import { setProps } from "./utils";

// 47:28
let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // RootFiber 应用的根
let currentRoot = null; // 渲染成功之后的当前根 RootFiber
let deletions = []; // 删除的节点并不放在 effectList 中，需要单独记录并执行
let workInProgressFiber = null; // 正在工作中的 fiber
let hookIndex = 0;
export function scheduleRoot(rootFiber) {
	// {tag: TAG_ROOT, stateNode: container, props: { children: [element]}}
	if (currentRoot && currentRoot.alternate) {
		// 第二次之后的更新
		workInProgressRoot = currentRoot.alternate; // 第一次渲染出来的那个 fiber tree
		workInProgressRoot.alternate = currentRoot; // 让树的替身指向当前的 currentRoot
		if (rootFiber) {
			workInProgressRoot.props = rootFiber.props; // 让它的 props 跟新成新的 props
		}
	} else if (currentRoot) {
		// 说明至少已经渲染过一次了 第一次更新
		if (rootFiber) {
			rootFiber.alternate = currentRoot;
			workInProgressRoot = rootFiber;
		} else {
			workInProgressRoot = {
				...currentRoot,
				alternate: currentRoot,
			};
		}
	} else {
		// 如果说是第一次渲染
		workInProgressRoot = rootFiber;
	}
	workInProgressRoot.firstEffect = workInProgressRoot.lastEffect = workInProgressRoot.nextEffect = null;
	nextUnitOfWork = workInProgressRoot;
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
		if (effectTag) {
			// 有副作用
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
	} else if (currentFiber.tag === TAG_CLASS) {
		updateClassComponent(currentFiber);
	} else if (currentFiber.tag === TAG_FUNCTION_COMPONENT) {
		updateFunctionComponent(currentFiber);
	}
}

function updateFunctionComponent(currentFiber) {
	workInProgressFiber = currentFiber;
	hookIndex = 0;
	workInProgressFiber.hooks = [];
	const newChildren = [currentFiber.type(currentFiber.props)];
	reconcileChildren(currentFiber, newChildren);
}

function updateClassComponent(currentFiber) {
	if (!currentFiber.stateNode) {
		// 类组件的 stateNode 组件的实例
		// 类组件实例 和 fiber 双向指向
		currentFiber.stateNode = new currentFiber.type(currentFiber.props);
		currentFiber.stateNode.internalFiber = currentFiber;
		currentFiber.updateQueue = new UpdateQueue();
	}
	// 给组件的实例的 state 赋值
	currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(
		currentFiber.stateNode.state
	);
	let newElement = currentFiber.stateNode.render();
	const newChildren = [newElement];
	reconcileChildren(currentFiber, newChildren);
}

function updateHost(currentFiber) {
	if (!currentFiber.stateNode) {
		// 如果没有创建 DOM 节点
		currentFiber.stateNode = createDOM(currentFiber);
	}
	const newChildren = currentFiber.props.children;
	reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
	if (currentFiber.tag === TAG_TEXT) {
		return document.createTextNode(currentFiber.props.text);
	} else if (currentFiber.tag === TAG_HOST) {
		// span div
		let stateNode = document.createElement(currentFiber.type);
		updateDOM(stateNode, {}, currentFiber.props);
		return stateNode;
	}
}

function updateDOM(stateNode, oldProps, newProps) {
	if (stateNode && stateNode.setAttribute) {
		setProps(stateNode, oldProps, newProps);
	}
}

function updateHostText(currentFiber) {
	if (!currentFiber.stateNode) {
		// 如果没有创建 DOM 节点
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
	let oldFiber = currentFiber.alternate && currentFiber.alternate.child; // currentFiber 有 alternate 且 alternate 有 child
	if (oldFiber) {
		oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
	}
	let prevSibling; // 上一个新的子 fiber
	// 遍历创建子 fiber
	while (newChildIndex < newChildren.length || oldFiber) {
		let newChild = newChildren[newChildIndex]; // 取出元素节点
		let newFiber;
		const sameType =
			oldFiber && newChild && oldFiber.type === newChild.type;
		let tag;
		if (
			newChild &&
			typeof newChild.type === "function" &&
			newChild.type.prototype.isReactComponent
		) {
			tag = TAG_CLASS;
		} else if (newChild &&
			typeof newChild.type === "function") {
			tag = TAG_FUNCTION_COMPONENT; // 函数组件
		} else if (newChild && newChild.type === ELEMENT_TEXT) {
			tag = TAG_TEXT; // 文本节点
		} else if (newChild && typeof newChild.type === "string") {
			tag = TAG_HOST; // 如果是字符串，那么是一个原生 DOM 节点
		}
		// beginWork 创建 fiber，在 completeUnitOfWork 的时候收集 effect

		if (sameType) {
			// 说明老 fiber 和新的虚拟 DOM 类型一致，可以复用旧DOM节点，更新即可
			if (oldFiber.alternate) {
				// 说明至少已经更新过一次了；如果有上上次的 fiber，就拿过来作为这一次的 fiber，复用
				newFiber = oldFiber.alternate;
				newFiber.props = newChild.props;
				newFiber.alternate = oldFiber;
				newFiber.effectTag = UPDATE;
				newFiber.updateQueue =
					oldFiber.updateQueue || new UpdateQueue();
				newFiber.nextEffect = null;
			} else {
				newFiber = {
					tag: oldFiber.tag,
					type: oldFiber.type,
					props: newChild.props, // 使用新的元素的 props
					stateNode: oldFiber.stateNode,
					return: currentFiber,
					updateQueue: oldFiber.updateQueue || new UpdateQueue(),
					alternate: oldFiber, // 让新的 fiber 的 alternate 指向老的 fiber 节点
					effectTag: UPDATE,
					nextEffect: null,
				};
			}
		} else {
			if (newChild) {
				// 看看虚拟 DOM 是否为 null
				newFiber = {
					tag,
					type: newChild.type,
					props: newChild.props,
					stateNode: null, // div 还没有创建 DOM 元素
					return: currentFiber,
					effectTag: PLACEMENT, // 副作用标识，render 阶段 我们会收集副作用，增加、删除、更新
					updateQueue: new UpdateQueue(),
					nextEffect: null, // effectlist 也是一个单链表
					// effectlist 顺序和完成顺序是一样的，但是节点可能会少，只放有副作用的
				};
			}
			if (oldFiber) {
				oldFiber.effectTag = DELETION;
				deletions.push(oldFiber);
			}
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling; // oldFiber 指针向后移动一次
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
		console.log("render 阶段结束");
		commitRoot();
	}
	console.log("work loop ing");
	// 不管有没有任务，都请求再次调度 每一帧都要执行一个 workloop
	requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
	deletions.forEach(commitWork); // 执行effect list之前先把该删除的删除
	let currentFiber = workInProgressRoot.firstEffect;
	while (currentFiber) {
		commitWork(currentFiber);
		currentFiber = currentFiber.nextEffect;
	}
	deletions.length = 0; // 提交之后要清空 deletion 数组
	currentRoot = workInProgressRoot; // 把当前渲染成功的根 fiber，赋给 currentRoot
	workInProgressRoot = null;
}

function commitWork(currentFiber) {
	if (!currentFiber) return;
	let returnFiber = currentFiber.return;
	// 可能不是 DOM，找到 DOM 为止
	while (
		returnFiber.tag !== TAG_HOST &&
		returnFiber.tag !== TAG_ROOT &&
		returnFiber.tag !== TAG_TEXT
	) {
		returnFiber = returnFiber.return;
	}
	let domReturn = returnFiber.stateNode;
	if (currentFiber.effectTag === PLACEMENT) {
		// 新增加的节点
		// 如果要挂载的节点不是 DOM 节点，比如说是类组件 Fiber，找到真实 DOM 节点为止
		let nextFiber = currentFiber;
		// if (nextFiber.tag = TAG_CLASS) { // 类组件不用挂载
		// 	return;
		// }
		while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
			nextFiber = currentFiber.child;
		}
		domReturn.appendChild(nextFiber.stateNode);
	} else if (currentFiber.effectTag === DELETION) {
		// 删除节点
		return commitDeletion(currentFiber, domReturn);
		// domReturn.removeChild(currentFiber.stateNode);
	} else if (currentFiber.effectTag === UPDATE) {
		if (currentFiber.type === ELEMENT_TEXT) {
			if (
				currentFiber.alternate.props.textContent !==
				currentFiber.props.text
			) {
				currentFiber.stateNode.textContent = currentFiber.props.text;
			}
		} else {
			updateDOM(
				currentFiber.stateNode,
				currentFiber.alternate.props,
				currentFiber.props
			);
		}
	}
	currentFiber.effectTag = null;
}

function commitDeletion(currentFiber, domReturn) {
	if (currentFiber.tag == TAG_HOST || currentFiber.tag == TAG_TEXT) {
		domReturn.removeChild(currentFiber.stateNode);
	} else {
		commitDeletion(currentFiber.child, domReturn);
	}
}

export function useReducer(reducer, initialValue) {
	let newHook = workInProgressFiber.alternate && workInProgressFiber.alternate.hooks && workInProgressFiber.alternate.hooks[hookIndex];
	if (newHook) {
		// 第二次渲染
		newHook.state = newHook.updateQueue.forceUpdate(newHook.state);
	} else {
		newHook = {
			state: initialValue,
			updateQueue: new UpdateQueue(), // 空的更新队列
		}
	}
	const dispatch = action => { // action = { type: 'ADD' }
		let payload = reducer ? reducer(newHook.state, action) : action;
		newHook.updateQueue.enqueueUpdate(
			new Update(payload)
		);
		scheduleRoot();
	}
	workInProgressFiber.hooks[hookIndex++] = newHook;
	return [newHook.state, dispatch];
}

export function useState(initialValue) {
	return useReducer(null, initialValue);
}

// react 告诉浏览器，我现在有任务请你在闲的时候，
requestIdleCallback(workLoop, { timeout: 500 });