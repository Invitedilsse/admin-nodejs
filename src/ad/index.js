import { adminDb } from "../../config/adminDb.js";

export const createadvertismentTable = async () => {
    const creatEnumstatus = `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_link') THEN
        CREATE TYPE social_link AS ENUM ('facebook', 'instagram', 'whatsapp','telegram','youtube','x','website','google','shop');
      END IF;
    END$$;`

  const query = `
  CREATE TABLE IF NOT EXISTS advertisment (
   id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      created_by UUID,
      name text not null,
      logo JSONB,
      header text default null,
      subheader text default null,
      body text default null,
      footer text default null,
      is_active boolean default true,
      contact_us text default null,
      linkname_1 social_link default null, 
      link_1 text default null,
      linkname_2 social_link default null, 
      link_2 text default null,
      linkname_3 social_link default null, 
      link_3 text default null,
      view_count integer default 0,
      ad_type text default 'sponsored',
      offer_header text,
      offer_subheader text,
      offer_details text,
      ad_display_type text default 'standard',-- standard, popup, video, etc.
      link_btn_text text,
      btn_icon JSONB,


      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
  `;

   const createadFileTableQuery = `
    CREATE TABLE  IF NOT EXISTS advertisment_filelist (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      ad_id UUID REFERENCES advertisment(id) ON DELETE CASCADE,
      file JSONB,
      type TEXT NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`

  const adrules = `
   CREATE TABLE IF NOT EXISTS advertisment_rules (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      ad_id UUID REFERENCES advertisment(id) ON DELETE CASCADE,

      page_name TEXT NOT NULL,              -- home, profile, dashboard, etc.
      slot_name TEXT NOT NULL,              -- top_banner, mid_card, popup, footer
      min_interval_seconds INTEGER DEFAULT 0, -- minimum gap before showing again
      max_shows_per_user INTEGER DEFAULT 0,   -- 0 = unlimited
      max_shows_per_day INTEGER DEFAULT 0,
      max_shows_per_session INTEGER DEFAULT 0,

      priority INTEGER DEFAULT 0,           -- higher means shown first
      start_at TIMESTAMP DEFAULT NULL,
      end_at TIMESTAMP DEFAULT NULL,

      is_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `

  const adImpression = `
  CREATE TABLE IF NOT EXISTS advertisment_impressions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ad_id UUID REFERENCES advertisment(id) ON DELETE CASCADE,
  user_id UUID DEFAULT NULL,
  session_id TEXT DEFAULT NULL,

  page_name TEXT NOT NULL,
  slot_name TEXT NOT NULL,

  shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  clicked_at TIMESTAMP DEFAULT NULL
);
  `

  const adviewhistory = `
      CREATE TABLE IF NOT EXISTS device_sessions (
      id         UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
      session_id UUID    DEFAULT uuid_generate_v4() UNIQUE,  -- this is what mobile sends with every ad call
      device_id  TEXT    NOT NULL,
      fcm_token  TEXT    NOT NULL UNIQUE,                    -- unique constraint prevents duplicates
      user_id    UUID    DEFAULT NULL,                       -- linked on login, null for guests
      view_count INTEGER DEFAULT 0,
      expire_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`

     const aduiconfig = `
      CREATE TABLE IF NOT EXISTS advertisment_ui_config ( id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, 
      ad_id UUID REFERENCES advertisment(id) ON DELETE CASCADE UNIQUE, 
      payload JSONB NOT NULL DEFAULT '{}'::jsonb, 
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
      );`

  try {
    await adminDb.query(creatEnumstatus)
    await adminDb.query(query);
    console.log("✅ advertisment table created successfully");
    await adminDb.query(createadFileTableQuery)
    console.log("✅ advertisment file table created successfully");

    await adminDb.query(adrules)
    console.log("✅ advertisment adrules table created successfully");
    await adminDb.query(adImpression)
    console.log("✅ advertisment adImpression table created successfully");

     await adminDb.query(adviewhistory)
    console.log("✅ advertisment device session table created successfully");

    await adminDb.query(aduiconfig)
    console.log("✅ advertisment ui config table created successfully");

  } catch (error) {
    console.error("❌ Error creating advertisement table:", error);
  } 
};
