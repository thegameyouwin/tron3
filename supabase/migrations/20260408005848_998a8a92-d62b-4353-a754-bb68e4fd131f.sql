
-- Upsert deposit wallets
INSERT INTO site_settings (key, value) VALUES ('deposit_wallets', '{"bitcoin":{"address":"bc1qhxj7jt0mcljnn6h0qxcjey3g237phss9zmmnrq","network":"BTC"},"ethereum":{"address":"0x8d3007b24c93347adD0C503E886f53585D10F2CB","network":"ERC20"},"binancecoin":{"address":"0x8d3007b24c93347adD0C503E886f53585D10F2CB","network":"BEP-20"},"tether":{"address":"TFYBTBoknjnZsYQKSPG2kjsAsZVNR8fkWB","network":"TRC20","recommended":true},"ripple":{"address":"rMXG6jF9b9zsdGzgv2edDbdTsBHojGvF2b","network":"XRP"},"solana":{"address":"9yZBBxPxUahdu4BJd5wz8SU4ZxVrgu7PvsDGUjGciCwm","network":"SOL"},"cardano":{"address":"addr1qyu3t0yatnsk2sv4varh7f2jwc7404uzztqc2dkunzzr7nwtdkxk9zdruk90g4l99r7uxuqyk308fhnarl07zt4texzs97q9fg","network":"ADA"}}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Upsert email sender
INSERT INTO site_settings (key, value) VALUES ('email_sender', '"Tronnlix <support@tronnlix.com>"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
