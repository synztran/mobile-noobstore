-- Hero Campaigns Table
CREATE TABLE IF NOT EXISTS public.hero_campaigns (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  subtitle text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  cta_text text NOT NULL DEFAULT 'KHÁM PHÁ',
  cta_link text NOT NULL DEFAULT '/shop',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Trust Props Table
CREATE TABLE IF NOT EXISTS public.trust_props (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  heading text NOT NULL,
  body text NOT NULL,
  icon text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT now()
);

-- Community Gallery Table
CREATE TABLE IF NOT EXISTS public.community_gallery (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  image_url text NOT NULL,
  alt_text text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT now()
);

-- Creators Table
CREATE TABLE IF NOT EXISTS public.creators (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  role text NOT NULL,
  image_url text NOT NULL,
  social_handle text NOT NULL,
  color_theme text NOT NULL DEFAULT 'bg-primary-container',
  bio text,
  created_at timestamp without time zone DEFAULT now()
);

-- Insert default data
INSERT INTO public.hero_campaigns (title, subtitle, description, image_url, cta_text, cta_link, is_active)
VALUES (
  'ĐỘ CHÍNH XÁC ĐẾN TỪNG MILIMET',
  'SERIES 01 // CÓ SẴN NGAY BÂY GIỜ',
  'Phay CNC từ nhôm 6061. Trải nghiệm tactile tuyệt vời dành cho những người đam mê.',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDDva_45nSGDicEx_fEZ0bwK6sip9lQEJCc3TThFGgc9KR0uzMqsbcxEpquoDes4R1BNIufmFftnc9WqRHzyGpF4FbIWcb79CJ61Lw-BS_UtkL4_KMvKVzveSzA9ctX4d2fAH9FpQeyWTf9gmh0gYh4rKYO031I8CO7Q9XQsfnzSijuq5TcaaWK_l2YTjDkJ295fDbcqzebTnRqEyxnATCgaXmyKA1GqxTiOVXmTCaZMB99PJj2qNAwDsXQtXlsI4VmYz6Fk5tnNcc',
  'KHÁM PHÁ BỘ SƯU TẬP',
  '/shop',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO public.trust_props (heading, body, icon, "order")
VALUES
  ('VẬN CHUYỂN TOÀN CẦU', 'Giao hàng quốc tế có bảo hiểm từ trung tâm phân phối của chúng tôi tại Singapore.', 'truck', 1),
  ('HỖ TRỢ TRỌN ĐỜI', 'Bảo hành phần cứng bao gồm tất cả lỗi CNC và bo mạch PCB.', 'shield-check', 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.community_gallery (image_url, alt_text, "order")
VALUES
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuApkuArAiiORB8Lw9Sejdih12A0-AKrVNgNcgfDDOUNgNmIPoSR2nk_dKiMBTufS3jT7nDy6qhV0mh-hfK6sEl-B57vUAyTcDkv37HduoSuel3h-UtIVFbHwn92xNQdIuZGZY3_kV-KsjlgYIWbs05cq3rACxaTmDqJq4YznijB99BiW68ibXLzfseg3-8zOggGjMLt97FAQ8XPL7G9Hz33Kycg8WjMFujx_gul-3iO4OPH57Z4AnOUGX99-eWqSsxTGH8w_baBopg', 'Community build 1 — minimal desk setup', 1),
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuCzj829CUhc8b2Z1s6j-HkUv2Vk83LXycqsezbfd4XaAV2Z8w0MTCec-B_67Ft68Ig-C778Q5qJy9f37WKchHfUnNT9kL3AMvt_JfDQf-iFgI9sXYYda87IPXdkCeURiFN4hbn4-_D7gnH_Zk2NV40EU4Nv1afMh4wS4rPzjgsu7jVbVOGwkJ-8h442-nVVkx7J5zw1NHgFtI_TT6VH3PdpknNkx4Rki88QggC-j3skUWDmJ03mDo3dHURYTyxo5mix6TsPLsG3q9k', 'Community build 2 — keycap detail', 2),
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuAXIssWwq-BES6y7x6c1ucBgdT-hTsvCJJjAIJ74SyUDzSBCFSWpMP1x8esnuwUkPMkSNmzpbjgovBKM_lA7KQq6etPo7hO8wTam6ZaPPoUme9hcs0NNS6xcwBVOO5NzwcR5_vnLSit9DMt1qRirb8L8gqhMSRcLoQVoasiVl_CqjBo5h53tTAVYp45xSFB9D5Zo8qoy8pstypwVIf6zh-3v6RXNskQk6cijnPPdb3p7xUgr_1FF70bLHcXwP5e6ucnVKKd0jZ1o4', 'Community build 3 — atmospheric lighting', 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.creators (name, role, image_url, social_handle, color_theme, bio)
VALUES
  ('ALEX R.', 'KỸ SƯ TRƯỞNG', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMyZg4oq8PLEevZmYBXT5QRQ-Lrcg2cbRlTX5n8AT52gv4ZoBkHQa91-_9DHf7Yb5ihp2Mb2dWlbf23SW7COy1yvmq6paXy2kcxxiiufO30oHkA_8cJAptIyxwhPiYjzksaCYqib1vHODGuzBz_-i-TwLaRPBIu8YW6ruyS_Wmw-YljACxb38Fjs2eBJSWQ67FLJHte2qhu2PWg8_h4-J3GqKudKCELTp_Of4ZXDZEidW_HOaOW7Hq9ukkgCWTSK1pqCA26xJWejo', '@alex_builds', 'bg-primary-container', 'Thiết kế mechanical keyboards độc đáo'),
  ('SARA M.', 'THIẾT KẾ SÁNG TẠO', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCBcW8sc6MNa0Ae0AAqcwjpsaj9IzqTVR6jgcNeAjnYlgQBk2aoZcvIGnWtxFHjBPz8BO6sZgvM2TK2_CuDkrdcttq-sQq7TaFHiMuNBjWud7EvrWFHg0qTga92WSKwTp6S312jImVz2lbUxqJDowABUMdXUw_jkOvwj8VBw9sgUGR-RfphZoYyqie7YOoL2nd9WtLk5bLIug2LGg4v8MPiePfG_BgNu3udDW918NQKhrC9D1zrBfRoYhDmwJ9jkrAKaRk', '@sara_designs', 'bg-secondary-container', 'Chuyên về customization keycap'),
  ('JORDAN K.', 'SWITCH EXPERT', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_example', '@jordan_switches', 'bg-tertiary-container', 'Đánh giá switch chuyên sâu'),
  ('MAYA T.', 'COMMUNITY MANAGER', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_example2', '@maya_noobstore', 'bg-error-container', 'Quản lý cộng đồng và sự kiện')
ON CONFLICT DO NOTHING;
