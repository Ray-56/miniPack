function TreeNode(val) {
    this.val = val;
    this.left = this.right = null;
}

function arrToTree(nums) {
    const root = new TreeNode(nums[0]);
    const queue = [root];
    let isleft = true;

    for (let i = 1; i < nums.length; i++) {
        const node = queue[0];
        if (isleft) {
            if (nums[i] != null) {
                node.left = new TreeNode(nums[i]);
                queue.push(node.left);
            }
            isleft = false;
        } else {
            if (nums[i] != null) {
                node.right = new TreeNode(nums[i]);
                queue.push(node.right);
                queue.shift();
            }
            isleft = true;
        }
    }

    return root;
}

const root = arrToTree([4, 2, 7, 1, 3, 6, 9]);

/**
 * Definition for a binary tree node.
 * function TreeNode(val) {
 *     this.val = val;
 *     this.left = this.right = null;
 * }
 */
/**
 * @param {TreeNode} root
 * @return {TreeNode}
 */
var invertTree = function(root) {
    if (!root) return null;

    const left = invertTree(root.left);
    const right = invertTree(root.right);
    root.left = right;
    root.right = left;
    return root;
};

console.log(invertTree(root));