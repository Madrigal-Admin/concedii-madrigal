-- Limită: maxim 2 invitați nominalizați per solicitant, per eveniment.
-- Solicitantul este identificat după nume (fără diferență între litere mari/mici
-- și fără spații în plus). Se rulează o singură dată în Supabase → SQL Editor.

drop function if exists public.nominalizare_creeaza(uuid, text, text, jsonb);
drop function if exists public.nominalizare_creeaza(uuid, text, text, text[]);

create or replace function public.nominalizare_creeaza(
  p_eveniment_id uuid,
  p_solicitant_nume text,
  p_solicitant_functie text,
  p_invitati jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nume text := regexp_replace(trim(coalesce(p_solicitant_nume, '')), '\s+', ' ', 'g');
  v_lista jsonb;
  v_deja int;
  v_acum int;
begin
  if v_nume = '' then
    raise exception 'nume_lipsa';
  end if;
  if p_solicitant_functie not in ('Corist', 'Organizare', 'Management') then
    raise exception 'functie_invalida';
  end if;
  if not exists (select 1 from public.evenimente where id = p_eveniment_id) then
    raise exception 'eveniment_invalid';
  end if;

  -- doar nume nevide, text
  select coalesce(jsonb_agg(to_jsonb(trim(x))), '[]'::jsonb)
    into v_lista
    from jsonb_array_elements_text(coalesce(p_invitati, '[]'::jsonb)) as t(x)
   where trim(x) <> '';

  v_acum := jsonb_array_length(v_lista);
  if v_acum = 0 then
    raise exception 'fara_invitati';
  end if;

  select coalesce(sum(jsonb_array_length(invitati)), 0)
    into v_deja
    from public.cereri_invitati
   where eveniment_id = p_eveniment_id
     and lower(regexp_replace(trim(solicitant_nume), '\s+', ' ', 'g')) = lower(v_nume);

  if v_deja + v_acum > 2 then
    raise exception 'limita_2_invitati';
  end if;

  insert into public.cereri_invitati (eveniment_id, solicitant_nume, solicitant_functie, invitati)
  values (p_eveniment_id, v_nume, p_solicitant_functie, v_lista);
end;
$$;

grant execute on function public.nominalizare_creeaza(uuid, text, text, jsonb) to anon, authenticated;
