ALTER TABLE public.pf_nexus_invoices ADD COLUMN IF NOT EXISTS invoice_number text;
CREATE UNIQUE INDEX IF NOT EXISTS pf_nexus_invoices_invoice_number_key ON public.pf_nexus_invoices (invoice_number) WHERE invoice_number IS NOT NULL;

INSERT INTO public.user_roles (user_id, role)
VALUES ('8887b12c-a707-4e2b-8d8f-ea4ae43dd6fd', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.pf_nexus_invoices
  (user_id, invoice_number, trading_date, realized_net_profit, user_share, platform_share, amount_due, currency, due_date, status)
VALUES
  ('8887b12c-a707-4e2b-8d8f-ea4ae43dd6fd', 'TEST-PFN-100-NGN', CURRENT_DATE, 333.34, 233.34, 100, 100, 'NGN', CURRENT_DATE + 1, 'due')
ON CONFLICT DO NOTHING;

CREATE POLICY "Admins can view all invoices"
ON public.pf_nexus_invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all payments"
ON public.pf_nexus_payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));