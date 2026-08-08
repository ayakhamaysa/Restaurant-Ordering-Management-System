let orders=[];
let kitchenChannel=null;
let refreshTimer=null;
let statusBusy=new Set();
let relativeTimeTimer=null;

async function init(){
  if(!requireSupabase())return;
  await loadRestaurantSettings();
  startKitchenClock();
  await loadOrders();
  subscribeOrders();
  relativeTimeTimer=setInterval(renderOrders,30000);
}

async function loadOrders(){
  const {data,error}=await sb.from('orders')
    .select('*,order_items(*)')
    .in('status',['new','preparing','ready'])
    .order('created_at',{ascending:true});
  if(error){
    ordersGrid.innerHTML=`<div class="notice">${esc(error.message)}</div>`;
    setRealtimeState('error','تعذر تحديث الطلبات');
    return;
  }
  orders=data||[];
  renderOrders();
}

function relativeTime(value){
  const date=new Date(value);
  const diff=Math.max(0,Math.floor((Date.now()-date.getTime())/1000));
  if(diff<45)return 'الآن';
  if(diff<3600){const m=Math.floor(diff/60);return `منذ ${m} ${m===1?'دقيقة':'دقائق'}`;}
  if(diff<86400){const h=Math.floor(diff/3600);return `منذ ${h} ${h===1?'ساعة':'ساعات'}`;}
  return date.toLocaleDateString('ar',{month:'short',day:'numeric'});
}

function actionInfo(status){
  if(status==='new')return {next:'preparing',text:'بدء التحضير',icon:'♨'};
  if(status==='preparing')return {next:'ready',text:'الطلب جاهز',icon:'✓'};
  return {next:'delivered',text:'تم التسليم',icon:'✓'};
}

function orderCard(o){
  const busy=statusBusy.has(o.id);
  const action=actionInfo(o.status);
  const notes=o.notes?`<div class="kitchen-order-note"><strong>ملاحظة:</strong> ${esc(o.notes)}</div>`:'';
  return `<article class="order-card kitchen-pro-card" data-order-id="${o.id}">
    <div class="kitchen-card-top">
      <div class="kitchen-order-main"><h3>#${o.order_number}</h3><div class="kitchen-table-line"><span class="table-icon">▣</span> طاولة ${esc(o.table_number)}</div></div>
      <div class="kitchen-time-wrap"><span class="status status-${o.status}">${statusText(o.status)}</span><time>${relativeTime(o.created_at)}</time></div>
    </div>
    <ul class="order-items kitchen-pro-items">${(o.order_items||[]).map(i=>`<li><span><b>${i.quantity} ×</b> ${esc(i.product_name)}</span><strong>${money(i.unit_price*i.quantity)}</strong></li>`).join('')}</ul>
    ${notes}
    <div class="total-row kitchen-pro-total"><span>الإجمالي</span><strong>${money(o.total)}</strong></div>
    <div class="order-actions kitchen-pro-actions">
      <button class="btn btn-light kitchen-print-btn" onclick="printOrder('${o.id}')" aria-label="طباعة الطلب">طباعة</button>
      <button class="btn kitchen-status-btn kitchen-action-${o.status}" ${busy?'disabled':''} onclick="setStatus('${o.id}','${action.next}',this)">${busy?'جاري النقل…':`${action.icon} ${action.text}`}</button>
    </div>
  </article>`;
}

function renderOrders(){
  const groups=[
    {status:'new',title:'طلبات جديدة',hint:'بانتظار بدء التحضير',icon:'▤'},
    {status:'preparing',title:'قيد التحضير',hint:'يتم تجهيزها الآن',icon:'♨'},
    {status:'ready',title:'جاهزة للتسليم',hint:'بانتظار تقديمها للطاولة',icon:'✓'}
  ];
  ordersGrid.innerHTML=groups.map(group=>{
    const list=orders.filter(o=>o.status===group.status);
    return `<section class="kitchen-lane kitchen-lane-${group.status}">
      <div class="kitchen-lane-head">
        <div class="kitchen-lane-title"><span class="kitchen-lane-icon">${group.icon}</span><div><h2>${group.title}</h2><p>${group.hint}</p></div></div>
        <span class="kitchen-count">${list.length}</span>
      </div>
      <div class="kitchen-lane-orders">${list.map(orderCard).join('')||`<div class="kitchen-lane-empty"><span>${group.icon}</span><p>لا توجد طلبات هنا</p></div>`}</div>
    </section>`;
  }).join('');
}

function statusText(s){return({new:'جديد',preparing:'قيد التحضير',ready:'جاهز',delivered:'تم التسليم',cancelled:'ملغي'})[s]||s}

async function setStatus(id,status,button){
  if(statusBusy.has(id))return;
  const order=orders.find(o=>o.id===id);
  if(!order)return;
  const previousStatus=order.status;
  statusBusy.add(id);
  order.status=status;
  renderOrders();

  const {error}=await sb.from('orders').update({status}).eq('id',id);
  statusBusy.delete(id);
  if(error){
    order.status=previousStatus;
    renderOrders();
    showKitchenToast(error.message,true);
    return;
  }

  if(status==='delivered') orders=orders.filter(o=>o.id!==id);
  renderOrders();
  const messages={preparing:'تم بدء تحضير الطلب',ready:'تم نقل الطلب إلى الجاهزة',delivered:'تم تسليم الطلب بنجاح'};
  showKitchenToast(messages[status]||'تم تحديث الطلب');
  scheduleOrdersRefresh();
}

function scheduleOrdersRefresh(){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(loadOrders,180);
}

function setRealtimeState(state,text){
  const el=document.getElementById('kitchenRealtimeState');
  if(!el)return;
  el.className=`realtime-state realtime-${state}`;
  el.innerHTML=`<span></span>${text}`;
}

function subscribeOrders(){
  if(kitchenChannel) sb.removeChannel(kitchenChannel);
  kitchenChannel=sb.channel('kitchen-orders-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'orders'},scheduleOrdersRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'order_items'},scheduleOrdersRefresh)
    .subscribe(status=>{
      if(status==='SUBSCRIBED') setRealtimeState('online','متصل');
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT') setRealtimeState('error','انقطع الاتصال');
      else if(status==='CLOSED') setRealtimeState('waiting','إعادة الاتصال…');
    });
}

function startKitchenClock(){
  const el=document.getElementById('kitchenClock');
  if(!el)return;
  const update=()=>{el.textContent=new Date().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});};
  update();setInterval(update,30000);
}

function showKitchenToast(message,isError=false){
  const toast=document.getElementById('kitchenToast');
  if(!toast)return;
  toast.textContent=message;
  toast.classList.toggle('error',isError);
  toast.classList.add('show');
  clearTimeout(window.kitchenToastTimer);
  window.kitchenToastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
}

function printOrder(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  printArea.innerHTML=`<div class="receipt"><h2>${esc(liveSettings.restaurant_name||cfg.restaurantName)}</h2><h3>طلب #${o.order_number}</h3><p>الطاولة: ${o.table_number}</p><p>${new Date(o.created_at).toLocaleString('ar')}</p><hr>${(o.order_items||[]).map(i=>`<p>${i.quantity} × ${esc(i.product_name)} — ${money(i.unit_price*i.quantity)}</p>`).join('')}<hr>${o.notes?`<p>ملاحظة: ${esc(o.notes)}</p>`:''}<strong>الإجمالي: ${money(o.total)}</strong></div>`;
  window.print();
}

init();
