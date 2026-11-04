-- RLS regression: notifications and Web Push subscriptions are USER-owned.
-- Run after Free staging baseline, member security checks and migrations.
UPDATE public.profiles SET is_active = true
WHERE id = '10000000-0000-4000-8000-000000000002';

INSERT INTO public.notifications (user_id, type, title, is_read) VALUES
('10000000-0000-4000-8000-000000000001','DRAFT_REVIEW','Leader-only QC',false),
('10000000-0000-4000-8000-000000000002','DRAFT_REVIEW','Editor-only QC',false);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $verify$
DECLARE changed integer;
BEGIN
  IF (SELECT count(*) FROM public.notifications) <> 1 THEN
    RAISE EXCEPTION 'Editor can read other users notifications';
  END IF;

  UPDATE public.notifications SET is_read = true
  WHERE user_id='10000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'Editor can mark manager notification read';
  END IF;

  UPDATE public.notifications SET is_read = true
  WHERE user_id='10000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'Editor cannot mark their own notification read';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
  VALUES('10000000-0000-4000-8000-000000000002',
    'https://push.example.test/editor-only', 'key-editor', 'auth-editor');

  RAISE NOTICE 'Notification owner-only SELECT and UPDATE: PASS';
END $verify$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $verify$
DECLARE hijackSucceeded boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.notifications) <> 1 THEN
    RAISE EXCEPTION 'Manager can read other user private notifications';
  END IF;

  IF (SELECT count(*) FROM public.push_subscriptions) <> 0 THEN
    RAISE EXCEPTION 'Manager can see editor Web Push subscription';
  END IF;

  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES('10000000-0000-4000-8000-000000000001',
      'https://push.example.test/editor-only', 'hijack', 'hijack')
    ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth;
    hijackSucceeded := true;
  EXCEPTION WHEN OTHERS THEN
    -- A unique or RLS failure proves the endpoint is not transferable
    -- from another user's browser through authenticated Data API access.
    NULL;
  END;
  IF hijackSucceeded THEN
    RAISE EXCEPTION 'Push subscription endpoint takeover was allowed';
  END IF;
  RAISE NOTICE 'Web Push subscription ownership: PASS';
END $verify$;
RESET ROLE;

DO $verify$
BEGIN
  IF (SELECT user_id FROM public.push_subscriptions
      WHERE endpoint='https://push.example.test/editor-only')
    IS DISTINCT FROM '10000000-0000-4000-8000-000000000002'::uuid THEN
    RAISE EXCEPTION 'Push subscription owner was changed';
  END IF;
END $verify$;

-- Legacy FCM token registration must obey the same ownership policy.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
INSERT INTO public.push_tokens(user_id,token,platform)
VALUES('10000000-0000-4000-8000-000000000002','fcm-editor-only','web');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $verify$
DECLARE hijackSucceeded boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.push_tokens) <> 0 THEN
    RAISE EXCEPTION 'Manager can read editor FCM token';
  END IF;

  BEGIN
    INSERT INTO public.push_tokens(user_id,token,platform)
    VALUES('10000000-0000-4000-8000-000000000001','fcm-editor-only','web')
    ON CONFLICT (token) DO UPDATE SET user_id=EXCLUDED.user_id;
    hijackSucceeded := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF hijackSucceeded THEN
    RAISE EXCEPTION 'FCM device token was transferable to another user';
  END IF;
  RAISE NOTICE 'FCM token ownership: PASS';
END $verify$;
RESET ROLE;
