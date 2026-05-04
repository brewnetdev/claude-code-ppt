// Bullet/num-list <li>s in our sample HTML follow a uniform shape:
//   `<li><div>title<span class="sub">sub</span></div></li>`
// The `<div>` wrapper is layout-critical — both `.bullet-list li { display: flex }`
// and `.bullet-list li .sub { display: block }` rely on it. Browser default
// edits (Backspace at li boundary, paste, drag) can strip the wrapper, which
// flattens the entire list visually. The functions here are the deterministic
// repair primitives the editor uses to keep the invariant.

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
    } else {
      healthy = false;
      break;
    }
  }
  if (healthy && onlyDiv) {
    // Strip the whitespace-only siblings so future structural edits (Range
    // setStart at boundary, mergeListItems) operate on a clean shape.
    Array.from(li.childNodes).forEach((n) => {
      if (n !== onlyDiv) li.removeChild(n);
    });
    return onlyDiv;
  }
  // Append-based move preserves text-node identity so any active selection
  // Range pointing into a text node inside the <li> stays valid across the
  // re-wrap. That's why we don't `cloneNode` here.
  const wrap = document.createElement('div');
  while (li.firstChild) wrap.appendChild(li.firstChild);
  li.appendChild(wrap);
  return wrap;
}

export function enforceBulletListInvariant(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLLIElement>('.bullet-list > li, .num-list > li')
    .forEach((li) => {
      ensureLiWrapper(li);
    });
}
