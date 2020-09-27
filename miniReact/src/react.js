import { ELEMENT_TEXT } from "./constants";

/**
 * 创建元素（虚拟DOM）的方法
 * @param {*} type 元素的类型 div span  p
 * @param {*} config 配置对象 属性 key ref
 * @param  {...any} children 所有的子集，数组
 */
function createElement(type, config, ...children) {
    delete config.__self;
    delete config.__source; // 表示这个元素是在哪行那列哪个文件生成的
	return {
		type,
		props: {
			...config,
			// 这里做了兼容处理，如果是文本类型，创建节点返回
			children: children.map((child) => {
				return typeof child === "object"
					? child
					: {
							type: ELEMENT_TEXT,
							props: { text: child, children: [] },
					  };
			}),
		},
	};
}

const React = {
	createElement,
};

export default React;
