'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ScraperResponse {
  success: boolean;
  data?: string;
  error?: string;
  message?: string;
}

export default function ScraperPage() {
  const [isScrapingBills, setIsScrapingBills] = useState(false);
  const [scraperResults, setScraperResults] = useState<ScraperResponse | null>(null);
  const [stats, setStats] = useState<ScraperResponse | null>(null);

  const handleScrapeBills = async () => {
    setIsScrapingBills(true);
    setScraperResults(null);

    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'daily',
          options: { days: 30 }
        }),
      });

      const result: ScraperResponse = await response.json();
      setScraperResults(result);
      
      // Refresh stats after scraping
      if (result.success) {
        await fetchStats();
      }
    } catch (error) {
      setScraperResults({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape bills'
      });
    } finally {
      setIsScrapingBills(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/scraper');
      const result: ScraperResponse = await response.json();
      setStats(result);
    } catch (error) {
      setStats({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      });
    }
  };

  // Fetch stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Congress Data Scraper</h1>
          <p className="text-muted-foreground mt-2">
            Manually trigger congressional data downloads from Congress.gov API
          </p>
        </div>

        {/* Main Action Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📥</span>
              Download Recent Bills
            </CardTitle>
            <CardDescription>
              Scrape and download all congressional bills from the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleScrapeBills}
                disabled={isScrapingBills}
                size="lg"
                className="min-w-[200px]"
              >
                {isScrapingBills ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Scraping...
                  </>
                ) : (
                  <>
                    <span className="mr-2">📥</span>
                    Download Last 30 Days
                  </>
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                This will download all bills introduced in the last 30 days along with their actions, sponsors, and metadata.
              </div>
            </div>

            {/* Progress indicator */}
            {isScrapingBills && (
              <div className="space-y-2">
                <Progress value={undefined} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  Scraping congressional data... This may take several minutes.
                </p>
              </div>
            )}

            {/* Results */}
            {scraperResults && (
              <div className={`p-4 rounded-lg border ${scraperResults.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${scraperResults.success ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="font-medium">
                    {scraperResults.success ? "Scraping completed successfully!" : "Scraping failed"}
                  </span>
                </div>
                {scraperResults.message && (
                  <p className="text-sm mt-2">{scraperResults.message}</p>
                )}
                {scraperResults.error && (
                  <p className="text-sm text-red-600 mt-2">{scraperResults.error}</p>
                )}
                {scraperResults.data && (
                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                    {scraperResults.data}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Database Statistics
            </CardTitle>
            <CardDescription>
              Current data in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={fetchStats}
                disabled={isScrapingBills}
              >
                Refresh Stats
              </Button>
            </div>

            {stats && (
              <div className="mt-4">
                {stats.success ? (
                  <pre className="text-sm p-4 bg-gray-100 rounded overflow-x-auto">
                    {stats.data}
                  </pre>
                ) : (
                  <div className="p-4 rounded-lg border border-red-500 bg-red-50">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                      <span className="font-medium">
                        {stats.error || "Failed to fetch statistics"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to set up the scraper backend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Get a Congress.gov API key from <a href="https://api.data.gov/signup" target="_blank" className="text-blue-600 underline">api.data.gov</a></li>
              <li>Add <code className="bg-gray-100 px-2 py-1 rounded">CONGRESS_API_KEY=your_key</code> to your root <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file</li>
              <li>Install Python dependencies: <code className="bg-gray-100 px-2 py-1 rounded">npm run scraper:install</code></li>
              <li>Apply database migration: Copy and run the SQL from <code className="bg-gray-100 px-2 py-1 rounded">supabase_migration_manual.sql</code> in your Supabase dashboard</li>
              <li>Test the setup by clicking "Download Last 30 Days" above</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 