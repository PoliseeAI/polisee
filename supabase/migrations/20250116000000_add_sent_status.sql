-- Add email_sent field to generated_representative_messages
ALTER TABLE generated_representative_messages 
ADD COLUMN email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN email_sent_at TIMESTAMP; 