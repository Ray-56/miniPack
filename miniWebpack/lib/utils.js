const fs = require("fs");
const path = require("path");

function delFileFolderByName(url) {
	let files = [];
	// 判断路径是否存在
	if (fs.existsSync(url)) {
		files = fs.readdirSync(url);
		files.forEach((file, index) => {
			const curPath = path.join(url, file);
			// 是否为文件夹，递归
			if (fs.statSync(curPath).isDirectory()) {
				delFileFolderByName(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
	} else {
		console.log(`给定路径${path}不存在`);
	}
}

function delFileByName(url) {
	const curPath = path.join(url);
	fs.unlinkSync(curPath);
}

module.exports = {
	delFileFolderByName,
	delFileByName,
};
