const cfg = window.RESTAURANT_CONFIG;
document.documentElement.style.setProperty('--primary',cfg.colors.primary);
document.documentElement.style.setProperty('--secondary',cfg.colors.secondary);
document.documentElement.style.setProperty('--bg',cfg.colors.background);
document.documentElement.style.setProperty('--text',cfg.colors.text);
document.documentElement.style.setProperty('--success',cfg.colors.success||'#1F9D62');
const sb = window.supabase.createClient(cfg.supabase.url,cfg.supabase.anonKey);
let liveSettings={restaurant_name:cfg.restaurantName,tagline:cfg.tagline,phone:cfg.phone,address:cfg.address,working_hours:cfg.workingHours,map_url:cfg.mapUrl,venue_image_url:''};

function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function money(v){return `${Number(v||0).toFixed(2)} ${cfg.currency}`}
function requireSupabase(){if(cfg.supabase.url.includes('PUT_')||cfg.supabase.anonKey.includes('PUT_')){alert('ضعي بيانات Supabase في config.js أولًا');return false}return true}
async function loadRestaurantSettings(){
  if(!requireSupabase())return liveSettings;
  const {data}=await sb.from('restaurant_settings').select('*').eq('id',1).maybeSingle();
  if(data) liveSettings=data;
  applyRestaurantSettings();
  return liveSettings;
}
function applyRestaurantSettings(){
  const s=liveSettings;
  document.querySelectorAll('[data-restaurant-name]').forEach(e=>e.textContent=s.restaurant_name||cfg.restaurantName);
  document.querySelectorAll('[data-tagline]').forEach(e=>e.textContent=s.tagline||cfg.tagline);
  document.querySelectorAll('[data-phone]').forEach(e=>e.textContent=s.phone||cfg.phone);
  document.querySelectorAll('[data-address]').forEach(e=>e.textContent=s.address||cfg.address||'العنوان غير مضاف');
  document.querySelectorAll('[data-working-hours]').forEach(e=>e.textContent=s.working_hours||cfg.workingHours);
  document.querySelectorAll('[data-phone-link]').forEach(e=>{const p=(s.phone||cfg.phone||'').replace(/\s+/g,'');e.href=p?`tel:${p}`:'#'});
  document.querySelectorAll('[data-map-link]').forEach(e=>{e.href=s.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address||cfg.address||'')}`});
  document.querySelectorAll('[data-english-name]').forEach(e=>{e.textContent=cfg.englishName||'';e.hidden=!cfg.menu?.showEnglishName});
  const year=document.getElementById('footerYear');if(year)year.textContent=new Date().getFullYear();
  document.querySelectorAll('[data-logo-image]').forEach(e=>{if(s.venue_image_url){e.src=s.venue_image_url;e.classList.remove('hidden')}else{e.removeAttribute('src');e.classList.add('hidden')}});
}
applyRestaurantSettings();
