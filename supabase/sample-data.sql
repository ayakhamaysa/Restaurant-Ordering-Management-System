insert into public.categories(name,sort_order) values
('الوجبات الرئيسية',1),('المقبلات',2),('المشروبات',3),('الحلويات',4)
on conflict (name) do nothing;

insert into public.products(category_id,name,description,price,is_available)
select c.id,'برغر لحم','لحم، جبنة، خس وصوص خاص',25,true from public.categories c where c.name='الوجبات الرئيسية'
union all
select c.id,'بطاطا مقلية','بطاطا ذهبية مقرمشة',10,true from public.categories c where c.name='المقبلات'
union all
select c.id,'عصير برتقال','عصير طبيعي طازج',8,true from public.categories c where c.name='المشروبات'
union all
select c.id,'كنافة','كنافة نابلسية',15,true from public.categories c where c.name='الحلويات';
