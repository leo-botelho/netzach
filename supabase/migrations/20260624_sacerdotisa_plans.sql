-- Função para incrementar uso da sacerdotisa atomicamente
create or replace function increment_sacerdotisa_usage(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into sacerdotisa_usage (user_id, date, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set count = sacerdotisa_usage.count + 1;
end;
$$;

-- rollback: drop function if exists increment_sacerdotisa_usage(uuid);
