/* A semantic preview enhances ordinary links to the complete inline samples. */
(() => {
  const books = window.MACKENZIE_BOOKS;
  if (!books || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.id = 'reader';
  dialog.className = 'reader';
  dialog.setAttribute('aria-labelledby', 'reader-book');
  dialog.innerHTML = `<header class="reader-header"><div><p class="eyebrow">Reading preview</p><h2 id="reader-book"></h2></div><button type="button" data-close-reader aria-label="Close reading preview">Close <span aria-hidden="true">×</span></button></header><div class="reader-scroll" tabindex="0" role="region" aria-label="Preview text"><p class="reader-notice"></p><p class="eyebrow" id="reader-position" role="status" aria-live="polite"></p><article class="reader-page"><h3 tabindex="-1"></h3><div class="reader-prose"></div></article></div><footer class="reader-footer"><div class="reader-pagination"><button type="button" data-previous>← Previous</button><button type="button" data-next>Next →</button></div><a class="button reader-buy" target="_blank" rel="noopener noreferrer">Buy on Amazon ↗<span class="sr-only"> (opens in a new tab)</span></a><a class="text-link reader-about">About the book →</a></footer>`;
  document.body.append(dialog);
  const previous = dialog.querySelector('[data-previous]');
  const next = dialog.querySelector('[data-next]');
  const heading = dialog.querySelector('.reader-page h3');
  const prose = dialog.querySelector('.reader-prose');
  let selected = 0, page = 0, opener;
  function render(focus = false) {
    const book = books[selected], current = book.pages[page];
    heading.textContent = current[0];
    prose.replaceChildren(...current[1].split('\n').map(text => {const p=document.createElement('p');p.textContent=text;return p;}));
    dialog.querySelector('#reader-position').textContent = `Page ${page + 1} of ${book.pages.length}`;
    previous.disabled = page === 0;
    next.disabled = page === book.pages.length - 1;
    dialog.querySelector('.reader-scroll').scrollTop = 0;
    if (focus) heading.focus({preventScroll:true});
  }
  function turn(direction) {
    const target = Math.max(0, Math.min(books[selected].pages.length-1, page+direction));
    if (target !== page) {page=target;render(true);}
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-preview]');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const index = Number(link.dataset.preview);
    if (!Number.isInteger(index) || !books[index]) return;
    event.preventDefault();opener=link;selected=index;page=0;
    dialog.querySelector('#reader-book').textContent=books[index].title;
    dialog.querySelector('.reader-notice').textContent=index===0?'A book overview and companion essays. This preview is not a manuscript excerpt.':'Contents and a Chapter 1 excerpt from When Advantage Expires.';
    dialog.querySelector('.reader-buy').href=books[index].purchase;
    dialog.querySelector('.reader-about').href=index===0?'/built/':'/when-advantage-expires/';
    render();dialog.showModal();document.body.classList.add('reader-open');dialog.querySelector('[data-close-reader]').focus();
  });
  dialog.querySelector('[data-close-reader]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.classList.remove('reader-open');opener?.focus({preventScroll:true});});
  previous.addEventListener('click',()=>turn(-1));next.addEventListener('click',()=>turn(1));
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();turn(event.key==='ArrowRight'?1:-1);}
    if(event.key==='Tab'){
      const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')];const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  addEventListener('pagehide',()=>{if(dialog.open)dialog.close();});
})();
