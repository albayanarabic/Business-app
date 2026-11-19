-- BizTrack cloud schema. Run in the Supabase SQL editor.
-- Existing local records remain untouched; the client migrates them after sign-in.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  owner_name text,
  tagline text,
  category text,
  phone_number text,
  email text,
  address text,
  state text not null default 'Lagos',
  bank_name text,
  account_number text,
  account_name text,
  currency text not null default 'NGN',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.products (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null default '',
  cost_price numeric not null default 0,
  selling_price numeric not null default 0,
  stock_quantity numeric not null default 0,
  min_stock_level numeric not null default 5,
  unit text not null default 'units',
  barcode text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_number text,
  date timestamptz not null default now(),
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total_amount numeric not null default 0,
  total_cost numeric not null default 0,
  gross_profit numeric not null default 0,
  payment_status text not null default 'paid',
  amount_paid numeric not null default 0,
  balance_due numeric not null default 0,
  payment_method text not null default 'cash',
  customer_name text,
  customer_phone text,
  customer_id text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id text not null references public.sales(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity numeric not null default 0,
  cost_price numeric not null default 0,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  unit text not null default 'units'
);

create table if not exists public.customers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_debts (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  total_debt numeric not null default 0,
  amount_paid numeric not null default 0,
  balance_due numeric not null default 0,
  initial_date timestamptz not null default now(),
  due_date timestamptz,
  status text not null default 'pending',
  customer_address text,
  linked_sale_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debt_repayments (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  debt_id text not null references public.customer_debts(id) on delete cascade,
  amount numeric not null default 0,
  payment_method text not null default 'cash',
  date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  amount numeric not null default 0,
  category text not null default '',
  date timestamptz not null default now(),
  payment_method text not null default 'cash',
  description text,
  receipt_number text,
  created_at timestamptz not null default now()
);

-- Complete columns for projects that applied an earlier draft of this schema.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.businesses add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.businesses add column if not exists owner_name text;
alter table public.businesses add column if not exists name text;
alter table public.businesses add column if not exists tagline text;
alter table public.businesses add column if not exists category text;
alter table public.businesses add column if not exists phone_number text;
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists address text;
alter table public.businesses add column if not exists state text not null default 'Lagos';
alter table public.businesses add column if not exists bank_name text;
alter table public.businesses add column if not exists account_number text;
alter table public.businesses add column if not exists account_name text;
alter table public.businesses add column if not exists currency text not null default 'NGN';
alter table public.businesses add column if not exists logo_url text;
alter table public.products add column if not exists name text not null default '';
alter table public.products add column if not exists category text not null default '';
alter table public.products add column if not exists cost_price numeric not null default 0;
alter table public.products add column if not exists selling_price numeric not null default 0;
alter table public.products add column if not exists stock_quantity numeric not null default 0;
alter table public.products add column if not exists min_stock_level numeric not null default 5;
alter table public.products add column if not exists unit text not null default 'units';
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists image_url text;
alter table public.sales add column if not exists sale_number text;
alter table public.sales add column if not exists date timestamptz not null default now();
alter table public.sales add column if not exists subtotal numeric not null default 0;
alter table public.sales add column if not exists discount numeric not null default 0;
alter table public.sales add column if not exists total_amount numeric not null default 0;
alter table public.sales add column if not exists total_cost numeric not null default 0;
alter table public.sales add column if not exists gross_profit numeric not null default 0;
alter table public.sales add column if not exists payment_status text not null default 'paid';
alter table public.sales add column if not exists amount_paid numeric not null default 0;
alter table public.sales add column if not exists balance_due numeric not null default 0;
alter table public.sales add column if not exists payment_method text not null default 'cash';
alter table public.sales add column if not exists customer_name text;
alter table public.sales add column if not exists customer_phone text;
alter table public.sales add column if not exists customer_id text;
alter table public.sales add column if not exists notes text;
alter table public.sale_items add column if not exists sale_id text;
alter table public.sale_items add column if not exists product_id text;
alter table public.sale_items add column if not exists product_name text not null default '';
alter table public.sale_items add column if not exists quantity numeric not null default 0;
alter table public.sale_items add column if not exists cost_price numeric not null default 0;
alter table public.sale_items add column if not exists unit_price numeric not null default 0;
alter table public.sale_items add column if not exists total numeric not null default 0;
alter table public.sale_items add column if not exists unit text not null default 'units';
alter table public.customer_debts add column if not exists customer_name text not null default '';
alter table public.customer_debts add column if not exists customer_phone text;
alter table public.customer_debts add column if not exists customer_address text;
alter table public.customer_debts add column if not exists total_debt numeric not null default 0;
alter table public.customer_debts add column if not exists amount_paid numeric not null default 0;
alter table public.customer_debts add column if not exists balance_due numeric not null default 0;
alter table public.customer_debts add column if not exists initial_date timestamptz not null default now();
alter table public.customer_debts add column if not exists due_date timestamptz;
alter table public.customer_debts add column if not exists status text not null default 'pending';
alter table public.customer_debts add column if not exists linked_sale_id text;
alter table public.customer_debts add column if not exists notes text;
alter table public.debt_repayments add column if not exists debt_id text;
alter table public.debt_repayments add column if not exists amount numeric not null default 0;
alter table public.debt_repayments add column if not exists payment_method text not null default 'cash';
alter table public.debt_repayments add column if not exists date timestamptz not null default now();
alter table public.debt_repayments add column if not exists notes text;
alter table public.expenses add column if not exists title text;
alter table public.expenses add column if not exists amount numeric not null default 0;
alter table public.expenses add column if not exists category text not null default '';
alter table public.expenses add column if not exists date timestamptz not null default now();
alter table public.expenses add column if not exists payment_method text not null default 'cash';
alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists receipt_number text;

-- Add ownership columns to installations created by the earlier schema.
alter table public.profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.businesses add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.business_members add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.products add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.sales add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.sale_items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.customer_debts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.debt_repayments add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.expenses add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill old rows from their owning account before making ownership mandatory.
update public.profiles set user_id = id where user_id is null;
update public.businesses set user_id = owner_id where user_id is null;
update public.business_members set user_id = (
  select b.owner_id from public.businesses b where b.id = business_members.business_id
) where user_id is null;
update public.products set user_id = (
  select b.user_id from public.businesses b where b.id = products.business_id
) where user_id is null;
update public.sales set user_id = (
  select b.user_id from public.businesses b where b.id = sales.business_id
) where user_id is null;
update public.sale_items set user_id = (
  select s.user_id from public.sales s where s.id = sale_items.sale_id
) where user_id is null;
update public.customer_debts set user_id = (
  select b.user_id from public.businesses b where b.id = customer_debts.business_id
) where user_id is null;
update public.debt_repayments set user_id = (
  select d.user_id from public.customer_debts d where d.id = debt_repayments.debt_id
) where user_id is null;
update public.expenses set user_id = (
  select b.user_id from public.businesses b where b.id = expenses.business_id
) where user_id is null;

do $$
begin
  if exists (
    select 1 from (
      select user_id from public.profiles union all
      select user_id from public.businesses union all
      select user_id from public.business_members union all
      select user_id from public.products union all
      select user_id from public.sales union all
      select user_id from public.sale_items union all
      select user_id from public.customer_debts union all
      select user_id from public.debt_repayments union all
      select user_id from public.expenses
    ) rows_without_owner where user_id is null
  ) then
    raise exception 'Cannot apply BizTrack ownership migration: one or more existing rows have no owning user';
  end if;
end $$;

alter table public.profiles alter column user_id set not null;
alter table public.businesses alter column user_id set not null;
alter table public.business_members alter column user_id set not null;
alter table public.products alter column user_id set not null;
alter table public.sales alter column user_id set not null;
alter table public.sale_items alter column user_id set not null;
alter table public.customer_debts alter column user_id set not null;
alter table public.debt_repayments alter column user_id set not null;
alter table public.expenses alter column user_id set not null;

create index if not exists business_members_user_idx on public.business_members(user_id);
create index if not exists businesses_user_idx on public.businesses(user_id);
create index if not exists profiles_user_idx on public.profiles(user_id);
create index if not exists products_user_business_idx on public.products(user_id, business_id);
create index if not exists sales_user_business_idx on public.sales(user_id, business_id);
create index if not exists sale_items_user_business_idx on public.sale_items(user_id, business_id);
create index if not exists customers_user_business_idx on public.customers(user_id, business_id);
create index if not exists customer_debts_user_business_idx on public.customer_debts(user_id, business_id);
create index if not exists debt_repayments_user_business_idx on public.debt_repayments(user_id, business_id);
create index if not exists expenses_user_business_idx on public.expenses(user_id, business_id);

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business_id and b.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.business_members m
    where m.business_id = target_business_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_business_owner(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business_id and b.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.is_business_owner(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.is_business_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.customers enable row level security;
alter table public.customer_debts enable row level security;
alter table public.debt_repayments enable row level security;
alter table public.expenses enable row level security;

alter table public.businesses add column if not exists owner_name text;

do $$
declare existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles', 'businesses', 'business_members', 'products', 'sales',
        'sale_items', 'customers', 'customer_debts', 'debt_repayments', 'expenses'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I',
      existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  end loop;
end $$;

create policy "Profiles are isolated by user" on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and id = (select auth.uid()));

create policy "Business members can view businesses" on public.businesses
  for select to authenticated
  using (public.is_business_member(id));
create policy "Owners can create businesses" on public.businesses
  for insert to authenticated
  with check (user_id = (select auth.uid()) and owner_id = (select auth.uid()));
create policy "Owners can update businesses" on public.businesses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and owner_id = (select auth.uid()));
create policy "Owners can delete businesses" on public.businesses
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can view their memberships" on public.business_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_owner(business_id));
create policy "Owners can add memberships" on public.business_members
  for insert to authenticated
  with check (public.is_business_owner(business_id));
create policy "Owners can update memberships" on public.business_members
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));
create policy "Owners can remove memberships" on public.business_members
  for delete to authenticated
  using (public.is_business_owner(business_id));

create policy "Users can manage their business products" on public.products
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "Users can manage their business sales" on public.sales
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "Users can manage their business sale items" on public.sale_items
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "Users can manage their business customers" on public.customers
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "Users can manage their business debts" on public.customer_debts
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "Users can manage their business repayments" on public.debt_repayments
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "Users can manage their business expenses" on public.expenses
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

revoke all on public.profiles, public.businesses, public.business_members, public.products,
  public.sales, public.sale_items, public.customers, public.customer_debts,
  public.debt_repayments, public.expenses from anon, public;

grant select, insert, update, delete on public.profiles, public.businesses,
  public.business_members, public.products, public.sales, public.sale_items,
  public.customers, public.customer_debts, public.debt_repayments, public.expenses
to authenticated;
