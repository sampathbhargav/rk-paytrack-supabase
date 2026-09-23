// React mouse-leave events can use Window as relatedTarget when the pointer
// leaves the document. Node.contains accepts only Nodes (or null).
export function containsEventTarget(container, target) {
  const NodeType = container?.ownerDocument?.defaultView?.Node;
  return Boolean(NodeType && target instanceof NodeType && container.contains(target));
}
