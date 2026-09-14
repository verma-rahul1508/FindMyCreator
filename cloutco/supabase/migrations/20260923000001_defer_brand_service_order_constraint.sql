alter table public.brand_services
  drop constraint brand_services_brand_order_key;

alter table public.brand_services
  add constraint brand_services_brand_order_key
  unique (brand_id, service_order)
  deferrable initially deferred;
