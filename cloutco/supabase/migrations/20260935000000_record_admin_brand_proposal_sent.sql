create or replace function public.admin_record_brand_proposal_sent(p_brand_id uuid)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_recipient_email text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  update public.brands
  set proposal_sent_at = now()
  where id = p_brand_id
  returning email into v_recipient_email;

  if not found then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;

  insert into public.brand_audit_log(brand_id, action, changed_by, details)
  values (p_brand_id, 'proposal_sent', auth.uid(), jsonb_build_object('recipient', v_recipient_email));
end;
$$;

revoke all on function public.admin_record_brand_proposal_sent(uuid) from public, anon, authenticated;
grant execute on function public.admin_record_brand_proposal_sent(uuid) to authenticated;
