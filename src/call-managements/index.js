import { adminDb } from "../../config/adminDb.js";

export const createCallManagements = async () => {

  const createTableQuery = `
   CREATE TABLE IF NOT EXISTS  call_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    caller_id UUID NOT NULL,
    oid uuid,
    no_of_calls INTEGER DEFAULT 0,
    no_of_notifications INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    template_id uuid,
    template_name text,
    wamid text,
    status text,
    retry boolean default false,
    is_success boolean default false,
    CONSTRAINT unique_contact_oid_func UNIQUE (contact_id, caller_id, function_id,template_id,oid)
);`;

const createCallMessage=`
CREATE TABLE  IF NOT EXISTS call_history_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_history_id UUID NOT NULL REFERENCES call_history(id) ON DELETE CASCADE,
    msg TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT Null
);`

const createCallMessageTemplate=`
CREATE TABLE  IF NOT EXISTS call_history_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_id UUID NOT NULL,
    fields JSON NOT NULL,
    tempalte_name text,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT Null
);`

  try {

    await adminDb.query(createTableQuery);
    console.log("✅ call_history table created successfully");
    await adminDb.query(createCallMessage);
    console.log("✅ call_history_reasons table created successfully");
    await adminDb.query(createCallMessageTemplate);
    console.log("✅ call_history_templates table created successfully");
  } catch (error) {
    console.error("❌ Error creating call_history table:", error);
  } 
//   finally {
//     await adminDb.end();
//   }
};
