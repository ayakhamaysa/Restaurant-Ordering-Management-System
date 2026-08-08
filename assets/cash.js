let cashOrders=[];
let pendingCheckoutTable=null;
let cashChannel=null;
let cashRefreshTimer=null;

async function initCash(){
  if(!requireSupabase())return;
  await loadRestaurantSettings();
  document.title=cfg.cash?.pageTitle||'نظام الكاش';
  cashPageTitle.textContent=cfg.cash?.pageTitle||'نظام الكاش والطاولات';
  await loadCashOrders();
  subscribeCashOrders();
}

async function loadCashOrders(){
  const {data,error}=await sb.from('orders')
    .select('*,order_items(*)')
    .neq('status','cancelled')
    .order('created_at',{ascending:true});
  if(error){cashTables.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
  cashOrders=data||[];
  renderCashTables();
}

function renderCashTables(){
  const tableCount=Number(cfg.tableCount||20);
  const grouped=new Map();
  cashOrders.forEach(order=>{
    const key=Number(order.table_number);
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(order);
  });
  const occupied=[...grouped.keys()].length;
  const total=cashOrders.reduce((sum,o)=>sum+Number(o.total||0),0);
  occupiedCount.textContent=occupied;
  openTotal.textContent=money(total);

  cashTables.innerHTML=Array.from({length:tableCount},(_,i)=>{
    const table=i+1;
    const orders=grouped.get(table)||[];
    const tableTotal=orders.reduce((sum,o)=>sum+Number(o.total||0),0);
    const allItems=orders.flatMap(o=>o.order_items||[]);
    if(!orders.length){
      return `<article class="cash-table-card empty-table">
        <div class="cash-table-number"><span>طاولة</span><strong>${table}</strong></div>
        <div class="cash-empty-state">✓ ${esc(cfg.cash?.emptyTableText||'الطاولة فارغة')}</div>
      </article>`;
    }
    return `<article class="cash-table-card occupied-table">
      <div class="cash-table-head">
        <div class="cash-table-number"><span>طاولة</span><strong>${table}</strong></div>
        <span class="cash-open-badge">${esc(cfg.cash?.activeTableText||'طلب مفتوح')}</span>
      </div>
      <div class="cash-order-numbers">${orders.map(o=>`#${o.order_number}`).join(' · ')}</div>
      <ul class="cash-items">${allItems.map(item=>`<li><span>${item.quantity} × ${esc(item.product_name)}</span><b>${money(Number(item.unit_price)*Number(item.quantity))}</b></li>`).join('')}</ul>
      ${orders.some(o=>o.notes)?`<div class="cash-notes">${orders.filter(o=>o.notes).map(o=>`<p><strong>ملاحظة:</strong> ${esc(o.notes)}</p>`).join('')}</div>`:''}
      <div class="cash-total"><span>${esc(cfg.cash?.totalLabel||'الإجمالي')}</span><strong>${money(tableTotal)}</strong></div>
      <button class="btn cash-checkout-btn full" onclick="checkoutTable(${table})">✓ ${esc(cfg.cash?.checkoutButton||'تم الحساب')}</button>
    </article>`;
  }).join('');
}

function checkoutTable(tableNumber){
  const orders=cashOrders.filter(o=>Number(o.table_number)===Number(tableNumber));
  if(!orders.length)return;
  const total=orders.reduce((sum,o)=>sum+Number(o.total||0),0);
  pendingCheckoutTable=Number(tableNumber);
  confirmTableNumber.textContent=tableNumber;
  confirmTableTotal.textContent=money(total);
  cashConfirmModal.classList.add('open');
  cashConfirmModal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}

function closeCheckoutModal(){
  if(confirmCheckoutButton.disabled)return;
  pendingCheckoutTable=null;
  cashConfirmModal.classList.remove('open');
  cashConfirmModal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}

async function confirmCheckout(){
  if(!pendingCheckoutTable)return;
  const tableNumber=pendingCheckoutTable;
  confirmCheckoutButton.disabled=true;
  confirmCheckoutButton.innerHTML='<span class="cash-button-spinner"></span> جاري إغلاق الحساب';
  const {data,error}=await sb.rpc('settle_table',{p_table_number:tableNumber});
  if(error){
    confirmCheckoutButton.disabled=false;
    confirmCheckoutButton.textContent='✓ تأكيد الدفع';
    showCashToast(error.message,true);
    return;
  }
  confirmCheckoutButton.disabled=false;
  confirmCheckoutButton.textContent='✓ تأكيد الدفع';
  pendingCheckoutTable=null;
  cashConfirmModal.classList.remove('open');
  cashConfirmModal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  showCashToast(cfg.cash?.checkoutSuccess||'تم إغلاق حساب الطاولة بنجاح.');
  await loadCashOrders();
}

function showCashToast(message,isError=false){
  cashToast.textContent=message;
  cashToast.classList.toggle('error',isError);
  cashToast.classList.add('show');
  clearTimeout(window.cashToastTimer);
  window.cashToastTimer=setTimeout(()=>cashToast.classList.remove('show'),3000);
}

function scheduleCashRefresh(){
  clearTimeout(cashRefreshTimer);
  cashRefreshTimer=setTimeout(loadCashOrders,180);
}

function setCashRealtimeState(state,text){
  const el=document.getElementById('cashRealtimeState');
  if(!el)return;
  el.className=`realtime-state realtime-${state}`;
  el.innerHTML=`<span></span>${text}`;
}

function subscribeCashOrders(){
  if(cashChannel) sb.removeChannel(cashChannel);
  cashChannel=sb.channel('cash-orders-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'orders'},scheduleCashRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'order_items'},scheduleCashRefresh)
    .subscribe(status=>{
      if(status==='SUBSCRIBED') setCashRealtimeState('online','متصل — الحسابات تتحدث تلقائيًا');
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT') setCashRealtimeState('error','انقطع الاتصال — جاري إعادة المحاولة');
      else if(status==='CLOSED') setCashRealtimeState('waiting','إعادة الاتصال…');
    });
}


initCash();
