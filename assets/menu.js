let categories=[],products=[],cart=[],occupiedTables=new Set();

async function init(){
  if(!requireSupabase())return;
  await loadRestaurantSettings();
  await Promise.all([loadOccupiedTables(),loadMenu()]);
  subscribeOccupiedTables();
}

async function loadOccupiedTables(){
  const currentValue=Number(tableNumber?.value||0);
  const {data,error}=await sb.rpc('get_occupied_tables');
  if(error){
    console.error('تعذر تحميل الطاولات المشغولة:',error);
    occupiedTables=new Set();
  }else{
    occupiedTables=new Set((data||[]).map(row=>Number(row.table_number)));
  }
  renderTableOptions(currentValue);
}

function renderTableOptions(preferredValue=0){
  const available=[];
  tableNumber.innerHTML=Array.from({length:Number(cfg.tableCount||20)},(_,i)=>{
    const number=i+1;
    const occupied=occupiedTables.has(number);
    if(!occupied) available.push(number);
    return `<option value="${number}" ${occupied?'disabled':''}>طاولة ${number}${occupied?' — مشغولة':''}</option>`;
  }).join('');

  if(preferredValue && !occupiedTables.has(preferredValue)) tableNumber.value=String(preferredValue);
  else if(available.length) tableNumber.value=String(available[0]);

  const noTables=!available.length;
  tableNumber.disabled=noTables;
  submitBtn.disabled=noTables;
  if(noTables) submitBtn.textContent='جميع الطاولات مشغولة';
  else if(submitBtn.textContent==='جميع الطاولات مشغولة') submitBtn.textContent=cfg.order.submitButton;
}

function subscribeOccupiedTables(){
  sb.channel('menu-table-occupancy')
    .on('postgres_changes',{event:'*',schema:'public',table:'orders'},loadOccupiedTables)
    .subscribe();
}


async function loadMenu(){
  const [{data:c,error:ce},{data:p,error:pe}]=await Promise.all([
    sb.from('categories').select('*').eq('is_active',true).order('sort_order'),
    sb.from('products').select('*').eq('is_available',true).order('created_at')
  ]);
  if(ce||pe){loadingText.textContent='تعذر تحميل القائمة';return}
  categories=c||[];products=p||[];renderCategories();renderProducts();loadingText.textContent='';
  setupSectionObserver();
}
function renderCategories(){
  categoryTabs.innerHTML=categories.map((c,i)=>`<button class="tab ${i===0?'active':''}" data-category-link="${c.id}" onclick="scrollToCategory('${c.id}')">${esc(c.name)}</button>`).join('');
}
function scrollToCategory(id){
  const section=document.getElementById(`category-${id}`);
  if(!section)return;
  const offset=document.querySelector('.topbar')?.offsetHeight||0;
  const y=section.getBoundingClientRect().top+window.scrollY-offset-18;
  window.scrollTo({top:y,behavior:'smooth'});
  setActiveCategoryLink(id);
}
function setActiveCategoryLink(id){
  document.querySelectorAll('[data-category-link]').forEach(btn=>btn.classList.toggle('active',btn.dataset.categoryLink===id));
  const active=document.querySelector(`[data-category-link="${id}"]`);
  if(active && window.innerWidth<=900) active.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
}
function setupSectionObserver(){
  const sections=document.querySelectorAll('.category-section');
  if(!sections.length)return;
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible)setActiveCategoryLink(visible.target.dataset.categoryId);
  },{rootMargin:'-25% 0px -60% 0px',threshold:[0,.1,.3]});
  sections.forEach(s=>observer.observe(s));
}
function renderProducts(){
  productsGrid.innerHTML=categories.map(c=>{
    const list=products.filter(p=>p.category_id===c.id);
    if(!list.length)return '';
    return `<section id="category-${c.id}" class="category-section" data-category-id="${c.id}">
      <div class="category-heading"><h2>${esc(c.name)}</h2><span>${list.length} أصناف</span></div>
      <div class="grid">${list.map(productCard).join('')}</div>
    </section>`;
  }).join('')||`<p class="empty">${esc(cfg.menu.emptyMenuText)}</p>`;
}
function productCard(p){return `<article class="product-card product-row"><img class="product-image" src="${esc(p.image_url||cfg.assets.productPlaceholder)}" alt="${esc(p.name)}"><div class="product-body"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p></div><div class="product-actions"><strong>${money(p.price)}</strong><button class="btn btn-primary" onclick="addToCart('${p.id}',this)">${esc(cfg.menu.addButtonText)} <span>＋</span></button></div></article>`}
function addToCart(id,button){
  const p=products.find(x=>x.id===id),item=cart.find(x=>x.id===id);
  if(!p)return;
  item?item.qty++:cart.push({...p,qty:1});
  renderCart();
  showAddFeedback(p.name,button);
}
function showAddFeedback(productName,button){
  const cartButton=document.querySelector('.premium-cart');
  cartButton?.classList.remove('cart-bump');
  void cartButton?.offsetWidth;
  cartButton?.classList.add('cart-bump');
  setTimeout(()=>cartButton?.classList.remove('cart-bump'),550);

  if(button){
    const original=button.dataset.originalText||button.innerHTML;
    button.dataset.originalText=original;
    button.classList.add('added');
    button.innerHTML='تمت الإضافة ✓';
    clearTimeout(button._resetTimer);
    button._resetTimer=setTimeout(()=>{button.classList.remove('added');button.innerHTML=original},1100);
  }

  let toast=document.getElementById('cartToast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='cartToast';
    toast.className='cart-toast';
    toast.innerHTML='<span class="cart-toast-check">✓</span><div><strong>تمت الإضافة للسلة</strong><small></small></div><button type="button">عرض السلة</button>';
    toast.querySelector('button').onclick=()=>toggleCart(true);
    document.body.appendChild(toast);
  }
  toast.querySelector('small').textContent=productName;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer=setTimeout(()=>toast.classList.remove('show'),2600);
}
function changeQty(id,d){const i=cart.find(x=>x.id===id);if(!i)return;i.qty+=d;if(i.qty<=0)cart=cart.filter(x=>x.id!==id);renderCart()}
function renderCart(){cartCount.textContent=cart.reduce((a,b)=>a+b.qty,0);cartItems.innerHTML=cart.map(i=>`<div class="cart-item"><img src="${esc(i.image_url||cfg.assets.productPlaceholder)}"><div><strong>${esc(i.name)}</strong><div>${money(i.price)}</div></div><div class="qty"><button onclick="changeQty('${i.id}',-1)">−</button><span>${i.qty}</span><button onclick="changeQty('${i.id}',1)">+</button></div></div>`).join('')||`<p>${esc(cfg.order.emptyCartMessage)}</p>`;cartTotal.textContent=money(cart.reduce((a,b)=>a+b.price*b.qty,0))}
function toggleCart(open){cartDrawer.classList.toggle('open',open)}
function showOrderSuccess(){successModal.classList.add('open');successModal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
function closeSuccessModal(){successModal.classList.remove('open');successModal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}
async function submitOrder(){
  if(!cart.length)return alert(cfg.order.addItemFirstMessage);
  const selectedTable=Number(tableNumber.value);
  if(!selectedTable || occupiedTables.has(selectedTable)){
    await loadOccupiedTables();
    return alert(`الطاولة رقم ${selectedTable||''} مشغولة حاليًا. يرجى اختيار طاولة أخرى أو مراجعة الكاشير.`);
  }
  submitBtn.disabled=true;
  submitBtn.textContent=cfg.order.submittingText;
  const {error}=await sb.rpc('submit_order',{
    p_table_number:selectedTable,
    p_notes:orderNotes.value,
    p_items:cart.map(i=>({product_id:i.id,quantity:i.qty}))
  });
  submitBtn.disabled=false;
  submitBtn.textContent=cfg.order.submitButton;
  if(error){
    await loadOccupiedTables();
    const message=String(error.message||'');
    if(message.includes('TABLE_OCCUPIED')) return alert(`الطاولة رقم ${selectedTable} مشغولة حاليًا. يرجى اختيار طاولة أخرى أو مراجعة الكاشير.`);
    return alert(message);
  }
  occupiedTables.add(selectedTable);
  renderTableOptions();
  cart=[];
  orderNotes.value='';
  renderCart();
  toggleCart(false);
  setTimeout(()=>showOrderSuccess(),220);
}
init();
