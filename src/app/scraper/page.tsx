'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import { getBills, BillWithDetails, formatBillId } from '@/lib/bills';
import { getBillPDFUrl } from '@/lib/pdf-storage';
import { AuthGuard } from '@/components/auth';
import { 
  PlayCircle, 
  StopCircle, 
  RefreshCw, 
  Clock, 
  Database, 
  Search, 
  Settings, 
  Activity,
  AlertCircle,
  Loader2,
  FileText,
  Eye,
  Bot
} from 'lucide-react'

interface ScraperResponse {
  success: boolean;
  data?: string;
  error?: string;
  message?: string;
}

interface BatchSummaryStatus {
  success: boolean;
  totalBills: number;
  existingSummaries: number;
  billsWithoutSummaries: number;
  completionRate: number;
}

interface BatchSummaryResult {
  success: boolean;
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
  message: string;
  details: {
    totalBills: number;
    existingSummaries: number;
    billsToProcess: number;
  };
}

export default function ScraperPage() {
  const [isScrapingBills, setIsScrapingBills] = useState(false);
  const [scraperResults, setScraperResults] = useState<ScraperResponse | null>(null);
  const [stats, setStats] = useState<ScraperResponse | null>(null);
  const [bills, setBills] = useState<BillWithDetails[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillWithDetails | null>(null);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [billPdfUrl, setBillPdfUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Batch Processing State
  const [batchSummaryStatus, setBatchSummaryStatus] = useState<BatchSummaryStatus | null>(null);
  const [batchSummaryResult, setBatchSummaryResult] = useState<BatchSummaryResult | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

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
      
      // Refresh stats and bills after scraping
      if (result.success) {
        await fetchStats();
        await fetchBills();
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

  const fetchBills = async () => {
    try {
      const fetchedBills = await getBills();
      setBills(fetchedBills);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    }
  };

  const handlePreviewBill = async (bill: BillWithDetails) => {
    setSelectedBill(bill);
    const pdfUrl = await getBillPDFUrl(bill.bill_id);
    setBillPdfUrl(pdfUrl);
    setShowPdfDialog(true);
  };

  const fetchBatchSummaryStatus = async () => {
    try {
      const response = await fetch('/api/batch-summaries');
      const result: BatchSummaryStatus = await response.json();
      setBatchSummaryStatus(result);
    } catch (error) {
      console.error('Failed to fetch batch summary status:', error);
    }
  };

  const handleBatchSummaryGeneration = async (forceRegenerate: boolean = false) => {
    setIsBatchProcessing(true);
    setBatchSummaryResult(null);

    try {
      const response = await fetch('/api/batch-summaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forceRegenerate,
          maxBills: 120,
          skipExisting: !forceRegenerate
        }),
      });

      const result: BatchSummaryResult = await response.json();
      setBatchSummaryResult(result);
      
      // Refresh status after processing
      if (result.success) {
        await fetchBatchSummaryStatus();
      }
    } catch (error) {
      setBatchSummaryResult({
        success: false,
        processed: 0,
        skipped: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Failed to process batch summaries'],
        message: 'Failed to process batch summaries',
        details: {
          totalBills: 0,
          existingSummaries: 0,
          billsToProcess: 0
        }
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const filteredBills = bills.filter(bill => 
    bill.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.policy_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.sponsor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    // Parse the date string correctly to avoid timezone issues
    // The database stores dates as YYYY-MM-DD format
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    return date.toLocaleDateString();
  };

  // Fetch stats, bills, and batch summary status on component mount
  useEffect(() => {
    fetchStats();
    fetchBills();
    fetchBatchSummaryStatus();
  }, []);

  return (
    <AuthGuard>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Congress Data Scraper</h1>
            <p className="text-muted-foreground mt-2">
              Manually trigger congressional data downloads from Congress.gov API and manage bills
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

          {/* Bills Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Downloaded Bills Management
              </CardTitle>
              <CardDescription>
                Preview and manage bills in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search bills..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" onClick={fetchBills}>
                    Refresh Bills
                  </Button>
                </div>

                {/* Bills List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredBills.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No bills found. Try running the scraper first.
                    </div>
                  ) : (
                    filteredBills.slice(0, 10).map((bill) => (
                      <div key={bill.bill_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {formatBillId(bill)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {bill.policy_area}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm truncate">{bill.title}</h4>
                          <p className="text-xs text-gray-500">
                            {bill.sponsor_name} • {formatDate(bill.introduced_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewBill(bill)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {filteredBills.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    Showing 10 of {filteredBills.length} bills
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Batch Processing Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="text-2xl" />
                AI Bill Summaries
              </CardTitle>
              <CardDescription>
                Generate AI summaries for all bills at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Display */}
              {batchSummaryStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {batchSummaryStatus.totalBills}
                    </div>
                    <div className="text-sm text-gray-600">Total Bills</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {batchSummaryStatus.existingSummaries}
                    </div>
                    <div className="text-sm text-gray-600">With Summaries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {batchSummaryStatus.billsWithoutSummaries}
                    </div>
                    <div className="text-sm text-gray-600">Missing Summaries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {batchSummaryStatus.completionRate}%
                    </div>
                    <div className="text-sm text-gray-600">Completion Rate</div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {batchSummaryStatus && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>AI Summary Progress</span>
                    <span>{batchSummaryStatus.completionRate}%</span>
                  </div>
                  <Progress value={batchSummaryStatus.completionRate} className="w-full" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => handleBatchSummaryGeneration(false)}
                  disabled={isBatchProcessing}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {isBatchProcessing ? (
                    <>
                      <span className="mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Generate Missing Summaries
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => handleBatchSummaryGeneration(true)}
                  disabled={isBatchProcessing}
                  variant="outline"
                  size="lg"
                >
                  {isBatchProcessing ? (
                    <>
                      <span className="mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🔄</span>
                      Regenerate All
                    </>
                  )}
                </Button>

                <Button
                  onClick={fetchBatchSummaryStatus}
                  disabled={isBatchProcessing}
                  variant="outline"
                  size="sm"
                >
                  Refresh Status
                </Button>
              </div>

              {/* Progress indicator */}
              {isBatchProcessing && (
                <div className="space-y-2">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Generating AI summaries... This may take several minutes depending on the number of bills.
                  </p>
                </div>
              )}

              {/* Results Display */}
              {batchSummaryResult && (
                <div className={`p-4 rounded-lg border ${batchSummaryResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full ${batchSummaryResult.success ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="font-medium">
                      {batchSummaryResult.success ? "Batch processing completed!" : "Batch processing failed"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="font-medium text-green-600">Processed: </span>
                      {batchSummaryResult.processed}
                    </div>
                    <div>
                      <span className="font-medium text-blue-600">Skipped: </span>
                      {batchSummaryResult.skipped}
                    </div>
                    <div>
                      <span className="font-medium text-red-600">Failed: </span>
                      {batchSummaryResult.failed}
                    </div>
                  </div>
                  
                  <p className="text-sm">{batchSummaryResult.message}</p>
                  
                  {batchSummaryResult.errors.length > 0 && (
                    <div className="mt-2">
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-red-600">
                          View {batchSummaryResult.errors.length} Error(s)
                        </summary>
                        <div className="mt-2 text-xs space-y-1">
                          {batchSummaryResult.errors.map((error, index) => (
                            <div key={index} className="text-red-600 break-all">
                              {index + 1}. {error}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">About AI Summaries</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI summaries are generated using OpenAI's GPT-4o-mini model</li>
                  <li>• Summaries are cached to avoid repeated API calls</li>
                  <li>• Only bills with actual text content will be processed</li>
                  <li>• Processing is rate-limited to avoid API limits (1 request per second)</li>
                  <li>• Make sure your OpenAI API key is configured in environment variables</li>
                </ul>
              </div>
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

          {/* PDF Preview Dialog */}
          {selectedBill && (
            <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
              <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Admin Preview: {selectedBill.title}
                    <Badge variant="outline" className="font-mono">
                      {formatBillId(selectedBill)}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="h-[80vh] overflow-hidden">
                  {billPdfUrl ? (
                    <PDFViewer
                      fileUrl={billPdfUrl}
                      highlights={[]}
                      initialPage={1}
                      initialZoom={1.0}
                      onHighlightClick={(highlight) => {
                        console.log('Highlight clicked:', highlight);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No PDF available for this bill</p>
                        <p className="text-sm mt-2">PDF files are currently using sample data</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </AuthGuard>
  );
} 