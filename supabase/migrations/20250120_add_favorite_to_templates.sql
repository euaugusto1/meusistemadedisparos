-- Add is_favorite column to message_templates table
ALTER TABLE message_templates
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster queries on favorite templates
CREATE INDEX IF NOT EXISTS idx_message_templates_favorite
ON message_templates(user_id, is_favorite)
WHERE is_favorite = TRUE;
