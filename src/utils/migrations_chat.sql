-- Migration: Team Chat (General & 1-on-1 Direct Messages)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_role TEXT DEFAULT 'Staff',
    recipient_email TEXT DEFAULT NULL,
    recipient_name TEXT DEFAULT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast weekly filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipients ON chat_messages(sender_email, recipient_email);

-- Add column if table already exists
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS recipient_email TEXT DEFAULT NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS recipient_name TEXT DEFAULT NULL;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access on chat_messages" ON chat_messages FOR DELETE USING (true);
