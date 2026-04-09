
-- Re-add user INSERT on transactions (needed for deposit forms to create pending transactions)
CREATE POLICY "Users can create own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');
