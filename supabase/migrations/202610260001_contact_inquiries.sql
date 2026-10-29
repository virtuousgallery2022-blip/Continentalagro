create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  phone text not null check (char_length(phone) between 7 and 32),
  email text not null check (char_length(email) between 3 and 254),
  location text not null check (char_length(location) between 2 and 120),
  enquiry_type text not null check (char_length(enquiry_type) between 3 and 80),
  message text not null check (char_length(message) between 10 and 3000),
  created_at timestamptz not null default now()
);

alter table public.contact_inquiries enable row level security;
alter table public.contact_inquiries force row level security;

revoke all on table public.contact_inquiries from public, anon, authenticated, service_role;
grant insert (name, phone, email, location, enquiry_type, message)
  on table public.contact_inquiries to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.contact_rate_limits (
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  hit_count integer not null check (hit_count > 0),
  primary key (ip_hash, window_start)
);
create index if not exists contact_rate_limits_window_start_idx
  on private.contact_rate_limits (window_start);

revoke all on table private.contact_rate_limits from public, anon, authenticated, service_role;

create or replace function public.consume_contact_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_hit_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / 900) * 900);

  insert into private.contact_rate_limits (ip_hash, window_start, hit_count)
  values (p_ip_hash, v_window_start, 1)
  on conflict (ip_hash, window_start)
  do update set hit_count = private.contact_rate_limits.hit_count + 1
  returning hit_count into v_hit_count;

  if random() < 0.01 then
    delete from private.contact_rate_limits
    where window_start < now() - interval '1 day';
  end if;

  return v_hit_count <= 5;
end;
$$;

revoke all on function public.consume_contact_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text) to service_role;
