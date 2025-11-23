-- Add smart scheduling fields to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) DEFAULT 'immediate' CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring', 'smart')),
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB, -- {type: 'daily'|'weekly'|'monthly', interval: number, days: [0-6], time: 'HH:mm'}
ADD COLUMN IF NOT EXISTS throttle_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS throttle_rate INTEGER, -- messages per minute
ADD COLUMN IF NOT EXISTS throttle_delay INTEGER, -- delay in seconds between messages
ADD COLUMN IF NOT EXISTS smart_timing BOOLEAN DEFAULT false, -- use AI to suggest best time
ADD COLUMN IF NOT EXISTS suggested_send_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Add comment to explain scheduling fields
COMMENT ON COLUMN campaigns.schedule_type IS 'Type of scheduling: immediate, scheduled, recurring, or smart (AI-suggested)';
COMMENT ON COLUMN campaigns.recurrence_pattern IS 'JSON pattern for recurring campaigns: {type, interval, days, time}';
COMMENT ON COLUMN campaigns.throttle_enabled IS 'Enable gradual sending to avoid blocking';
COMMENT ON COLUMN campaigns.throttle_rate IS 'Maximum messages per minute';
COMMENT ON COLUMN campaigns.smart_timing IS 'Use AI to analyze best sending time based on contact timezone and engagement';
COMMENT ON COLUMN campaigns.pause_until IS 'Pause campaign until this timestamp';

-- Create table for scheduling logs
CREATE TABLE IF NOT EXISTS campaign_schedule_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'scheduled', 'paused', 'resumed', 'cancelled', 'sent'
  reason TEXT,
  metadata JSONB, -- store additional info like timezone, suggested time, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaign_schedule_logs_campaign_id ON campaign_schedule_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_schedule_logs_created_at ON campaign_schedule_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_paused ON campaigns(is_paused) WHERE is_paused = true;

-- Enable RLS
ALTER TABLE campaign_schedule_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_schedule_logs
CREATE POLICY "Users can view their own schedule logs"
  ON campaign_schedule_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule logs"
  ON campaign_schedule_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to get best send time based on timezone and historical engagement
CREATE OR REPLACE FUNCTION get_suggested_send_time(
  p_campaign_id UUID,
  p_timezone VARCHAR DEFAULT 'America/Sao_Paulo'
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_suggested_time TIMESTAMPTZ;
  v_best_hour INTEGER;
BEGIN
  -- Analyze message history to find best engagement hours
  -- For now, we'll use a simple heuristic: weekdays 10AM-4PM in contact's timezone
  -- In production, this would analyze actual engagement data

  -- Get current time in specified timezone
  v_best_hour := 10; -- Default to 10 AM

  -- Calculate next occurrence of best hour
  v_suggested_time := (NOW() AT TIME ZONE p_timezone)::DATE + (v_best_hour || ' hours')::INTERVAL;

  -- If time has passed today, schedule for tomorrow
  IF v_suggested_time < NOW() THEN
    v_suggested_time := v_suggested_time + INTERVAL '1 day';
  END IF;

  -- Avoid weekends - move to Monday if on weekend
  WHILE EXTRACT(DOW FROM v_suggested_time) IN (0, 6) LOOP
    v_suggested_time := v_suggested_time + INTERVAL '1 day';
  END LOOP;

  RETURN v_suggested_time;
END;
$$;

-- Function to process recurring campaigns
CREATE OR REPLACE FUNCTION process_recurring_campaign(p_campaign_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_campaign RECORD;
  v_next_run TIMESTAMPTZ;
  v_pattern JSONB;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_pattern := v_campaign.recurrence_pattern;

  -- Calculate next run based on pattern type
  CASE v_pattern->>'type'
    WHEN 'daily' THEN
      v_next_run := v_campaign.scheduled_at + (v_pattern->>'interval')::INTEGER * INTERVAL '1 day';
    WHEN 'weekly' THEN
      v_next_run := v_campaign.scheduled_at + (v_pattern->>'interval')::INTEGER * INTERVAL '1 week';
    WHEN 'monthly' THEN
      v_next_run := v_campaign.scheduled_at + (v_pattern->>'interval')::INTEGER * INTERVAL '1 month';
    ELSE
      v_next_run := NULL;
  END CASE;

  -- Update campaign with next scheduled time
  IF v_next_run IS NOT NULL THEN
    UPDATE campaigns
    SET scheduled_at = v_next_run
    WHERE id = p_campaign_id;
  END IF;

  RETURN v_next_run;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_suggested_send_time TO authenticated;
GRANT EXECUTE ON FUNCTION process_recurring_campaign TO authenticated;
