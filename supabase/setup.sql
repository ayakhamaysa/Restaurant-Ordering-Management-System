-- =========================================================
-- Restaurant Complete Setup
-- شغّلي هذا الملف كاملًا مرة واحدة داخل Supabase > SQL Editor
-- الأدمن: تسجيل دخول مطلوب
-- المطبخ: بدون تسجيل دخول
-- =========================================================

create extension if not exists pgcrypto;

-- الأقسام
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- الأصناف
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  image_path text not null default '',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- إعدادات المطعم: صف واحد فقط
create table if not exists public.restaurant_settings (
  id integer primary key default 1 check (id = 1),
  restaurant_name text not null default 'مطعم الذوق',
  tagline text not null default 'نكهة تستحق التجربة',
  phone text not null default '',
  address text not null default '',
  working_hours text not null default 'يوميًا 10:00 صباحًا – 12:00 ليلًا',
  map_url text not null default '',
  logo_url text not null default '',
  logo_path text not null default '',
  venue_image_url text not null default '',
  venue_image_path text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.restaurant_settings (id)
values (1)
on conflict (id) do nothing;
-- إضافة صورة المكان للنسخ القديمة أيضًا
alter table public.restaurant_settings add column if not exists venue_image_url text not null default '';
alter table public.restaurant_settings add column if not exists venue_image_path text not null default '';
alter table public.restaurant_settings add column if not exists working_hours text not null default 'يوميًا 10:00 صباحًا – 12:00 ليلًا';
alter table public.restaurant_settings add column if not exists map_url text not null default '';


-- صور السلايدر
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  image_url text not null,
  image_path text not null default '',
  image_fit text not null default 'cover' check (image_fit in ('cover','contain')),
  position_x integer not null default 50 check (position_x between 0 and 100),
  position_y integer not null default 50 check (position_y between 0 and 100),
  image_zoom numeric(4,2) not null default 1 check (image_zoom between 1 and 2.5),
  height_desktop integer not null default 420 check (height_desktop between 260 and 800),
  height_mobile integer not null default 320 check (height_mobile between 220 and 650),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- إضافة إعدادات عرض السلايدر للنسخ القديمة أيضًا
alter table public.hero_slides add column if not exists image_fit text not null default 'cover';
alter table public.hero_slides add column if not exists position_x integer not null default 50;
alter table public.hero_slides add column if not exists position_y integer not null default 50;
alter table public.hero_slides add column if not exists image_zoom numeric(4,2) not null default 1;
alter table public.hero_slides add column if not exists height_desktop integer not null default 420;
alter table public.hero_slides add column if not exists height_mobile integer not null default 320;

-- الطلبات
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  table_number integer not null check (table_number > 0),
  notes text not null default '',
  total numeric(10,2) not null default 0 check (total >= 0),
  status text not null default 'new' check (status in ('new','preparing','ready','delivered','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_hero_slides_sort on public.hero_slides(is_active, sort_order);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.hero_slides enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- حذف السياسات القديمة حتى يمكن تشغيل الملف أكثر من مرة

drop policy if exists "public read active categories" on public.categories;
drop policy if exists "admin manage categories" on public.categories;
drop policy if exists "public read available products" on public.products;
drop policy if exists "admin manage products" on public.products;
drop policy if exists "public read restaurant settings" on public.restaurant_settings;
drop policy if exists "admin manage restaurant settings" on public.restaurant_settings;
drop policy if exists "public read active hero slides" on public.hero_slides;
drop policy if exists "admin manage hero slides" on public.hero_slides;
drop policy if exists "authenticated read orders" on public.orders;
drop policy if exists "authenticated update orders" on public.orders;
drop policy if exists "public kitchen read orders" on public.orders;
drop policy if exists "public kitchen update orders" on public.orders;
drop policy if exists "authenticated read order items" on public.order_items;
drop policy if exists "public kitchen read order items" on public.order_items;

-- الزبون يرى الأقسام المفعلة، والأدمن يرى الكل
create policy "public read active categories" on public.categories
for select to anon, authenticated
using (is_active = true or auth.role() = 'authenticated');

create policy "admin manage categories" on public.categories
for all to authenticated using (true) with check (true);

-- الزبون يرى الأصناف المتوفرة، والأدمن يرى الكل
create policy "public read available products" on public.products
for select to anon, authenticated
using (is_available = true or auth.role() = 'authenticated');

create policy "admin manage products" on public.products
for all to authenticated using (true) with check (true);

-- إعدادات المطعم والسلايدر ظاهرة للجميع، وتعديلها للأدمن فقط
create policy "public read restaurant settings" on public.restaurant_settings
for select to anon, authenticated using (true);

create policy "admin manage restaurant settings" on public.restaurant_settings
for all to authenticated using (true) with check (true);

create policy "public read active hero slides" on public.hero_slides
for select to anon, authenticated
using (is_active = true or auth.role() = 'authenticated');

create policy "admin manage hero slides" on public.hero_slides
for all to authenticated using (true) with check (true);

-- شاشة المطبخ بدون حساب: قراءة الطلبات وتغيير حالتها
-- تنبيه: أي شخص يعرف رابط kitchen.html يستطيع مشاهدة الطلبات وتغيير حالتها.
create policy "public kitchen read orders" on public.orders
for select to anon, authenticated using (true);

create policy "public kitchen update orders" on public.orders
for update to anon, authenticated using (true) with check (true);

create policy "public kitchen read order items" on public.order_items
for select to anon, authenticated using (true);

-- إرجاع أرقام الطاولات المشغولة للمنيو
create or replace function public.get_occupied_tables()
returns table(table_number integer)
language sql
stable
security definer
set search_path = public
as $$
  select distinct o.table_number
  from public.orders o
  where o.status <> 'cancelled'
  order by o.table_number;
$$;

revoke all on function public.get_occupied_tables() from public;
grant execute on function public.get_occupied_tables() to anon, authenticated;

-- إنشاء الطلب كاملًا من الزبون بشكل آمن
-- يتم حجز الطاولة حتى يضغط الكاشير "تم الحساب" ويحذف طلباتها.
create or replace function public.submit_order(
  p_table_number integer,
  p_notes text,
  p_items jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number bigint;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_product_id uuid;
begin
  if p_table_number is null or p_table_number <= 0 then
    raise exception 'رقم الطاولة غير صحيح';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'الطلب فارغ';
  end if;

  -- يمنع وصول طلبين لنفس الطاولة في اللحظة نفسها.
  perform pg_advisory_xact_lock(731245, p_table_number);

  if exists (
    select 1
    from public.orders
    where table_number = p_table_number
      and status <> 'cancelled'
  ) then
    raise exception 'TABLE_OCCUPIED: الطاولة رقم % مشغولة حاليًا. يرجى اختيار طاولة أخرى أو مراجعة الكاشير.', p_table_number;
  end if;

  insert into public.orders(table_number, notes, total)
  values (p_table_number, coalesce(trim(p_notes),''), 0)
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'بيانات أحد الأصناف غير صحيحة';
    end;

    if v_qty is null or v_qty <= 0 then
      raise exception 'كمية أحد الأصناف غير صحيحة';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id and is_available = true;

    if not found then
      raise exception 'أحد الأصناف غير متوفر';
    end if;

    insert into public.order_items(order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price);

    v_total := v_total + (v_product.price * v_qty);
  end loop;

  update public.orders set total = v_total where id = v_order_id;
  return v_order_number;
end;
$$;

revoke all on function public.submit_order(integer,text,jsonb) from public;
grant execute on function public.submit_order(integer,text,jsonb) to anon, authenticated;


-- إغلاق حساب طاولة وحذف طلباتها نهائيًا بعد الدفع
create or replace function public.settle_table(
  p_table_number integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if p_table_number is null or p_table_number <= 0 then
    raise exception 'رقم الطاولة غير صحيح';
  end if;

  with deleted as (
    delete from public.orders
    where table_number = p_table_number
      and status <> 'cancelled'
    returning id
  )
  select count(*) into v_deleted from deleted;

  return v_deleted;
end;
$$;

revoke all on function public.settle_table(integer) from public;
grant execute on function public.settle_table(integer) to anon, authenticated;

-- مخزن صور المنتجات
insert into storage.buckets (id,name,public)
values ('product-images','product-images',true)
on conflict (id) do update set public=true;

-- مخزن الشعار وصور السلايدر
insert into storage.buckets (id,name,public)
values ('restaurant-media','restaurant-media',true)
on conflict (id) do update set public=true;

-- حذف سياسات التخزين القديمة

drop policy if exists "public view product images" on storage.objects;
drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin update product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;
drop policy if exists "public view restaurant media" on storage.objects;
drop policy if exists "admin upload restaurant media" on storage.objects;
drop policy if exists "admin update restaurant media" on storage.objects;
drop policy if exists "admin delete restaurant media" on storage.objects;

create policy "public view product images" on storage.objects
for select to anon, authenticated using (bucket_id='product-images');
create policy "admin upload product images" on storage.objects
for insert to authenticated with check (bucket_id='product-images');
create policy "admin update product images" on storage.objects
for update to authenticated using (bucket_id='product-images') with check (bucket_id='product-images');
create policy "admin delete product images" on storage.objects
for delete to authenticated using (bucket_id='product-images');

create policy "public view restaurant media" on storage.objects
for select to anon, authenticated using (bucket_id='restaurant-media');
create policy "admin upload restaurant media" on storage.objects
for insert to authenticated with check (bucket_id='restaurant-media');
create policy "admin update restaurant media" on storage.objects
for update to authenticated using (bucket_id='restaurant-media') with check (bucket_id='restaurant-media');
create policy "admin delete restaurant media" on storage.objects
for delete to authenticated using (bucket_id='restaurant-media');

-- Realtime للطلبات

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
