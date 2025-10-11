/**
 * 思维导图节点工具函数
 */

/**
 * 判断节点是否为根节点
 * @param node - 节点对象,需要包含 parent_id 字段
 * @returns 如果是根节点返回 true,否则返回 false
 */
export function isRootNode(node: { parent_id: string | null }): boolean {
  return node.parent_id === null;
}

/**
 * 判断节点是否为普通节点
 * @param node - 节点对象,需要包含 parent_id 字段
 * @returns 如果是普通节点返回 true,否则返回 false
 */
export function isNormalNode(node: { parent_id: string | null }): boolean {
  return node.parent_id !== null;
}
