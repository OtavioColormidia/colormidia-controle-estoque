CREATE UNIQUE INDEX IF NOT EXISTS form_responses_form_sheet_row_unique
ON public.form_responses (form_name, sheet_row)
WHERE sheet_row IS NOT NULL;