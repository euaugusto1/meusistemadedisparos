-- =====================================================
-- ANALYTICS EVENTS TABLE
-- =====================================================
-- Tabela para rastrear todos os eventos de mensagens para analytics

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_item_id UUID REFERENCES campaign_items(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'read', 'failed', 'responded', 'converted'
  recipient TEXT NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timestamps
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign_id ON analytics_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp ON analytics_events(user_id, event_timestamp DESC);

-- RLS Policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only view their own events
CREATE POLICY "Users can view own analytics events"
  ON analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the system can insert events (via service role)
CREATE POLICY "System can insert analytics events"
  ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- MATERIALIZED VIEW FOR HOURLY ANALYTICS
-- =====================================================
-- Pre-calculate hourly statistics for better performance

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_hourly_stats AS
SELECT
  user_id,
  campaign_id,
  DATE_TRUNC('hour', event_timestamp) as hour,
  EXTRACT(HOUR FROM event_timestamp)::INTEGER as hour_of_day,
  EXTRACT(DOW FROM event_timestamp)::INTEGER as day_of_week,

  COUNT(*) FILTER (WHERE event_type = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE event_type = 'read') as read_count,
  COUNT(*) FILTER (WHERE event_type = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE event_type = 'responded') as responded_count,
  COUNT(*) FILTER (WHERE event_type = 'converted') as converted_count,

  -- Calculate rates
  CASE
    WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0
    THEN (COUNT(*) FILTER (WHERE event_type = 'delivered')::FLOAT / COUNT(*) FILTER (WHERE event_type = 'sent') * 100)
    ELSE 0
  END as delivery_rate,

  CASE
    WHEN COUNT(*) FILTER (WHERE event_type = 'delivered') > 0
    THEN (COUNT(*) FILTER (WHERE event_type = 'read')::FLOAT / COUNT(*) FILTER (WHERE event_type = 'delivered') * 100)
    ELSE 0
  END as read_rate,

  CASE
    WHEN COUNT(*) FILTER (WHERE event_type = 'read') > 0
    THEN (COUNT(*) FILTER (WHERE event_type = 'responded')::FLOAT / COUNT(*) FILTER (WHERE event_type = 'read') * 100)
    ELSE 0
  END as response_rate

FROM analytics_events
GROUP BY user_id, campaign_id, DATE_TRUNC('hour', event_timestamp), hour_of_day, day_of_week;

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_analytics_hourly_stats_user ON analytics_hourly_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_hourly_stats_hour ON analytics_hourly_stats(hour);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_hourly_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_hourly_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to log analytics event
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_user_id UUID,
  p_campaign_id UUID,
  p_campaign_item_id UUID,
  p_instance_id UUID,
  p_event_type TEXT,
  p_recipient TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    user_id,
    campaign_id,
    campaign_item_id,
    instance_id,
    event_type,
    recipient,
    metadata,
    error_message
  ) VALUES (
    p_user_id,
    p_campaign_id,
    p_campaign_item_id,
    p_instance_id,
    p_event_type,
    p_recipient,
    p_metadata,
    p_error_message
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics summary
CREATE OR REPLACE FUNCTION get_user_analytics_summary(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_read BIGINT,
  total_failed BIGINT,
  total_responded BIGINT,
  total_converted BIGINT,
  avg_delivery_rate NUMERIC,
  avg_read_rate NUMERIC,
  avg_response_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'sent'),
    COUNT(*) FILTER (WHERE event_type = 'delivered'),
    COUNT(*) FILTER (WHERE event_type = 'read'),
    COUNT(*) FILTER (WHERE event_type = 'failed'),
    COUNT(*) FILTER (WHERE event_type = 'responded'),
    COUNT(*) FILTER (WHERE event_type = 'converted'),

    CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0
      THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'delivered')::NUMERIC / COUNT(*) FILTER (WHERE event_type = 'sent') * 100), 2)
      ELSE 0
    END,

    CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'delivered') > 0
      THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'read')::NUMERIC / COUNT(*) FILTER (WHERE event_type = 'delivered') * 100), 2)
      ELSE 0
    END,

    CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'read') > 0
      THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'responded')::NUMERIC / COUNT(*) FILTER (WHERE event_type = 'read') * 100), 2)
      ELSE 0
    END
  FROM analytics_events
  WHERE user_id = p_user_id
    AND event_timestamp >= p_start_date
    AND event_timestamp <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON analytics_events TO authenticated;
GRANT SELECT ON analytics_hourly_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_analytics_summary TO authenticated;
