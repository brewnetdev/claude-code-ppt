// Bullet/num-list <li>s in our sample HTML follow a uniform shape:
//   `<li><div>title<span class="sub">sub</span></div></li>`
// The `<div>` wrapper is layout-critical — both `.bullet-list li { display: flex }`
// and `.bullet-list li .sub { display: block }` rely on it. Browser default
// edits (Backspace at li boundary, paste, drag) can strip the wrapper, which
// flattens the entire list visually. The functions here are the deterministic
// repair primitives the editor uses to keep the invariant.

// A nested list (<ul>/<ol>) is a legitimate direct child of an <li> and must
// NOT be folded into the title wrapper <div> — doing so collapses the sub-list
// inline next to the parent title (the list CSS keys `display:flex` off the li).
function isListEl(node: Node): boolean {
  return (
    node.nodeType === 1 &&
    ((node as Element).tagName === 'UL' || (node as Element).tagName === 'OL')
  );
}

export function ensureLiWrapper(li: HTMLLIElement): HTMLDivElement {
  // Authoring HTML formats lists with leading/trailing whitespace text nodes:
  //
  //   <li>
  //     <div>title<span class="sub">sub</span></div>
  //   </li>
  //
  // Those text nodes are layout-irrelevant but childNodes counts them, so a
  // raw `length === 1` check would misfire on every healthy <li>. Treat the
  // <li> as already wrapped if its ELEMENT children consist of a single
  // <div> and the only other child nodes are whitespace-only text. That
  // also makes the function idempotent on the brewnet sample markup.
  let onlyDiv: HTMLDivElement | null = null;
  let healthy = true;
  for (const node of Array.from(li.childNodes)) {
    if (node instanceof HTMLDivElement) {
      if (onlyDiv) {
        healthy = false;
        break;
      }
      onlyDiv = node;
    } else if (node.nodeType === 3) {
      if ((node.nodeValue ?? '').trim().length > 0) {
        healthy = false;
        break;
      }
    } else if (isListEl(node)) {
      // Nested <ul>/<ol> is allowed alongside the wrapper <div>; leave in place.
      continue;
    } else {
      healthy = false;
      break;
    }
  }
  if (healthy && onlyDiv) {
    // Strip the whitespace-only siblings so future structural edits (Range
    // setStart at boundary, mergeListItems) operate on a clean shape — but
    // KEEP nested lists, which are valid <li> children.
    Array.from(li.childNodes).forEach((n) => {
      if (n === onlyDiv || isListEl(n)) return;
      li.removeChild(n);
    });
    return onlyDiv;
  }
  // Rewrap: move only the title/inline content into the wrapper; nested lists
  // stay as direct children of the <li> (re-appended after the wrapper).
  // Append-based move preserves text-node identity so any active selection
  // Range pointing into a text node inside the <li> stays valid across the
  // re-wrap. That's why we don't `cloneNode` here.
  const wrap = document.createElement('div');
  const nestedLists: Node[] = [];
  while (li.firstChild) {
    const child = li.firstChild;
    if (isListEl(child)) {
      li.removeChild(child);
      nestedLists.push(child);
    } else {
      wrap.appendChild(child);
    }
  }
  li.appendChild(wrap);
  for (const list of nestedLists) li.appendChild(list);
  return wrap;
}

export function enforceBulletListInvariant(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLLIElement>('.bullet-list > li, .num-list > li')
    .forEach((li) => {
      ensureLiWrapper(li);
    });
}
