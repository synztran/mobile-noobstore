-- Tracking-only mid-man cases. This schema does not hold, transfer, release,
-- or refund funds; state names describe case workflow only.
CREATE TABLE IF NOT EXISTS public.mid_man_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_a_name text NOT NULL CHECK (length(trim(party_a_name)) BETWEEN 1 AND 160),
  party_a_contact text NOT NULL CHECK (length(trim(party_a_contact)) BETWEEN 1 AND 240),
  party_b_name text NOT NULL CHECK (length(trim(party_b_name)) BETWEEN 1 AND 160),
  party_b_contact text NOT NULL CHECK (length(trim(party_b_contact)) BETWEEN 1 AND 240),
  agreed_terms text NOT NULL CHECK (length(trim(agreed_terms)) BETWEEN 1 AND 5000),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','funded_held','released','refunded','disputed')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.mid_man_case_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.mid_man_cases(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  operator_id uuid NOT NULL REFERENCES auth.users(id),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mid_man_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mid_man_case_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mid_man_cases, public.mid_man_case_audit FROM anon, authenticated;
GRANT ALL ON public.mid_man_cases, public.mid_man_case_audit TO service_role;

CREATE OR REPLACE FUNCTION public.transition_mid_man_case(
  p_case_id uuid, p_operator_id uuid, p_to_status text, p_note text DEFAULT ''
) RETURNS TABLE(error_code text, current_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM mid_man_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'MID_MAN_NOT_FOUND', NULL::text; RETURN; END IF;
  IF NOT (
    (v_status = 'pending' AND p_to_status IN ('funded_held','refunded','disputed')) OR
    (v_status = 'funded_held' AND p_to_status IN ('released','refunded','disputed')) OR
    (v_status = 'disputed' AND p_to_status IN ('released','refunded'))
  ) THEN RETURN QUERY SELECT 'MID_MAN_INVALID_TRANSITION', v_status; RETURN; END IF;
  UPDATE mid_man_cases SET status = p_to_status, updated_at = now() WHERE id = p_case_id;
  INSERT INTO mid_man_case_audit(case_id, from_status, to_status, operator_id, note)
  VALUES (p_case_id, v_status, p_to_status, p_operator_id, left(trim(p_note), 1000));
  RETURN QUERY SELECT NULL::text, p_to_status;
END $$;
REVOKE ALL ON FUNCTION public.transition_mid_man_case(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_mid_man_case(uuid,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.create_mid_man_case(
  p_party_a_name text, p_party_a_contact text, p_party_b_name text,
  p_party_b_contact text, p_agreed_terms text, p_amount numeric, p_operator_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO mid_man_cases(party_a_name, party_a_contact, party_b_name, party_b_contact, agreed_terms, amount, created_by)
  VALUES (trim(p_party_a_name), trim(p_party_a_contact), trim(p_party_b_name), trim(p_party_b_contact), trim(p_agreed_terms), p_amount, p_operator_id)
  RETURNING id INTO v_id;
  INSERT INTO mid_man_case_audit(case_id, from_status, to_status, operator_id, note)
  VALUES (v_id, NULL, 'pending', p_operator_id, 'Case created');
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_mid_man_case(text,text,text,text,text,numeric,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_mid_man_case(text,text,text,text,text,numeric,uuid) TO service_role;
