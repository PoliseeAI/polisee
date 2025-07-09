-- Simple bill insert for 8244
INSERT INTO bills (
    bill_id, congress, type, number, title, introduced_date, latest_action_date, 
    latest_action, sponsor_id, sponsor_name, sponsor_party, sponsor_state, 
    is_active, policy_area, origin_chamber
) VALUES (
    '8244', 118, 'HR', 8244, 
    'Ensuring Seniors Access to Quality Care Act',
    '2025-01-30', '2025-02-01',
    'Referred to House Committee on Health',
    'S000006', 'Rep. Jane Smith', 'D', 'NY',
    true, 'Health', 'House'
) ON CONFLICT (bill_id) DO NOTHING;
