'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface Bill {
  id: string;
  bill_id: string;
  bill_number: string;
  bill_type: string;
  title: string;
  congress: number;
  introduced_date: string;
  latest_action_date: string;
  latest_action_text: string;
  sponsor_name: string;
  sponsor_party: string;
  sponsor_state: string;
  is_active: boolean;
  created_at: string;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bills' as any)
        .select('*')
        .order('introduced_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setBills((data as any) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill =>
    (bill.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.bill_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.sponsor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Congressional Bills</h1>
        <div className="text-center">Loading bills...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Congressional Bills</h1>
        <div className="text-center text-red-600">Error: {error}</div>
        <Button onClick={fetchBills} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Congressional Bills</h1>
        <div className="text-sm text-gray-600">
          {bills.length} bills found
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search bills by title, number, or sponsor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBills.map((bill) => (
          <Card key={bill.id} className="h-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  {bill.bill_type?.toUpperCase() || 'BILL'} {bill.bill_number || 'N/A'}
                </CardTitle>
                <Badge variant={bill.is_active ? "default" : "secondary"}>
                  {bill.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-3 text-sm leading-tight">
                {bill.title || 'No title available'}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <strong>Sponsor:</strong> {bill.sponsor_name || 'Unknown'} 
                  {bill.sponsor_party && (
                    <span className="ml-1">({bill.sponsor_party}-{bill.sponsor_state || 'N/A'})</span>
                  )}
                </div>
                
                {bill.introduced_date && (
                  <div>
                    <strong>Introduced:</strong> {new Date(bill.introduced_date).toLocaleDateString()}
                  </div>
                )}
                
                {bill.latest_action_date && (
                  <div>
                    <strong>Latest Action:</strong> {new Date(bill.latest_action_date).toLocaleDateString()}
                  </div>
                )}
                
                {bill.latest_action_text && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    {bill.latest_action_text}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No bills found matching your search.</p>
        </div>
      )}
    </div>
  );
} 