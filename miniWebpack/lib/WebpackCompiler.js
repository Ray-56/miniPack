// babylon 主要把源码转成ast。Babylon 是 Babel 中使用的 JavaScript 解析器
// @babel/traverse 对 ast 解析遍历语法树负责替换、删除和添加节点
// @balel/types 用于 ast 节点的 Lodash-esque 使用程序库
// @babel/generator 结果生成

const babylon = require("babylon");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const type = require("@babel/types");
const ejs = require("ejs");
const tapable = require("tapable");

const path = require("path");
const fs = require("fs");

// const { module } = require("../bin/webpack.config");
// const { path } = require("@babel/traverse/lib/cache");

class WebpackCompiler {
	constructor(config) {
		this.config = config;
		this.modules = {};
		this.root = process.cwd(); // 当前地址
		this.entryPath = "./" + path.relative(this.root, this.config.entry);
		this.hooks = {
			entryInit: new tapable.SyncHook(),
			beforeCompile: new tapable.SyncHook(),
			afterCompile: new tapable.SyncHook(),
			afterPlugins: new tapable.SyncHook(),
			afteremit: new tapable.SyncWaterfallHook(["hash"]),
		};
		const plugins = this.config.plugins;
		if (Array.isArray(plugins)) {
			plugins.forEach((item) => {
				item.run(this);
			});
		}
	}
	run() {
		this.hooks.entryInit.call(); // 启动项目
		this.hooks.beforeCompile.call(); // 编译前运行
		this.buildModule(this.entryPath);
		this.hooks.afterCompile.call(); // 编译后运行
		this.outputFile();
		this.hooks.afterPlugins.call(); // 执行完 plugins 后运行
		this.hooks.afteremit.call(); // 结束后运行
	}
	// 根据路径解析源码
	parse(source, parentPath) {
		let ast = babylon.parse(source);
		let dependencies = [];
		traverse(ast, {
			CallExpression(p) {
				const node = p.node;
				if (node.callee.name === "require") {
					node.callee.name = "__webpack_require__"; // 将 require 替换成 __webpack_require__
					const moduledName =
						"./" + path.join(parentPath, node.arguments[0].value);
					dependencies.push(moduledName); // 记录当前页面中的 require 的名称
					node.arguments = [type.stringLiteral(moduledName)]; // 源码替换
				}
			},
		});
		const sourceCode = generator(ast).code;
		return {
			sourceCode,
			dependencies,
		};
	}
	// 编译生成 main 文件，递归
	buildModule(modulePath, isEntry) {
		// 根据路径拿到代码
		const source = this.getSourceByPath(modulePath);

		// 转换路径名称
		const moduleName = "./" + path.relative(this.root, modulePath);

		// 根据路径拿到源码，以及源码中依赖的其它模块名称集合
		const { sourceCode, dependencies } = this.parse(
			source,
			path.dirname(modulePath)
		);

		// 路径为key，代码为值，存入到 modules 对象中
		this.modules[moduleName] = sourceCode;

		// 遍历依赖模块名
		dependencies.forEach((item) => {
			// 递归调用
			this.buildModule(path.resolve(this.root, item));
		});
	}
	getSourceByPath(modulePath) {
		let content = fs.readFileSync(modulePath, "utf8");
		const rules = this.config.module.rules;
		for (let i = 0; i < rules.length; i++) {
			let { test, use } = rules[i];
			let len = use.length;
			if (test.test(modulePath)) {
				function changeLoader() {
					// 从后往前取
					let loader = require(use[--len]);
					content = loader(content);
					if (len > 0) {
						changeLoader();
					}
				}
				changeLoader();
			}
		}
		return content;
	}
	outputFile() {
		// 获取写好的模板内容
		const templateStr = this.getSourceByPath(
			path.join(__dirname, "main.ejs")
		);
		const code = ejs.render(templateStr, {
			entryPath: this.entryPath,
			modules: this.modules,
		});
		const outPath = path.join(
			this.config.output.path,
			this.config.output.filename
		);
		fs.writeFileSync(outPath, code);
	}
}

module.exports = WebpackCompiler;
