-- Add is_favorite column to contacts_lists table
ALTER TABLE contacts_lists
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster queries on favorite lists
CREATE INDEX idx_contacts_lists_favorite ON contacts_lists(user_id, is_favorite) WHERE is_favorite = TRUE;
