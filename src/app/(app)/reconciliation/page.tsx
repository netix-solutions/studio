'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  Database,
  Users,
  DollarSign,
  Megaphone,
  Handshake,
  Play,
  Wrench,
  ArrowRight,
  FileWarning,
  Activity,
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import {
  runReconciliation,
  getQuickHealthCheck,
  applyAutoFix,
} from '@/lib/reconciliation';
import {
  ReconciliationReport,
  ReconciliationIssue,
  ReconciliationOptions,
  ReconciliationSummary,
  ISSUE_SEVERITY_COLORS,
  ISSUE_CATEGORY_LABELS,
  type IssueCategory,
  type IssueSeverity,
} from '@/lib/types';

const defaultOptions: ReconciliationOptions = {
  checkCustomers: true,
  checkSubscriptions: true,
  checkRevenue: true,
  checkAdvertisements: true,
  checkLeads: true,
  checkUsers: true,
  autoFixEnabled: false,
};

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const colors = ISSUE_SEVERITY_COLORS[severity];
  const Icon = severity === 'critical' ? XCircle :
               severity === 'error' ? AlertCircle :
               severity === 'warning' ? AlertTriangle : Info;

  return (
    <Badge className={cn(colors.bg, colors.text, 'border', colors.border, 'capitalize')}>
      <Icon className="h-3 w-3 mr-1" />
      {severity}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', iconColor || 'text-muted-foreground')} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReconciliationPage() {
  const { firestore } = useFirebase();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [options, setOptions] = useState<ReconciliationOptions>(defaultOptions);
  const [quickSummary, setQuickSummary] = useState<ReconciliationSummary | null>(null);
  const [quickCheckLoading, setQuickCheckLoading] = useState(false);
  const [applyingFix, setApplyingFix] = useState<string | null>(null);

  const handleQuickCheck = useCallback(async () => {
    if (!firestore) return;

    setQuickCheckLoading(true);
    try {
      const result = await getQuickHealthCheck(firestore);
      setQuickSummary(result.summary);
    } catch (error) {
      console.error('Quick check failed:', error);
    }
    setQuickCheckLoading(false);
  }, [firestore]);

  const handleRunReconciliation = useCallback(async () => {
    if (!firestore) return;

    setIsRunning(true);
    setProgress('Starting reconciliation...');
    setReport(null);

    try {
      const result = await runReconciliation(firestore, options, (msg) => {
        setProgress(msg);
      });
      setReport(result);
    } catch (error) {
      console.error('Reconciliation failed:', error);
      setReport({
        id: 'error',
        createdAt: new Date(),
        status: 'failed',
        summary: {
          totalCustomers: 0,
          totalSubscriptions: 0,
          totalActiveSubscriptions: 0,
          totalAdvertisements: 0,
          totalLeads: 0,
          totalUsers: 0,
          calculatedMRR: 0,
          calculatedARR: 0,
          issuesCount: { info: 0, warning: 0, error: 0, critical: 0 },
        },
        issues: [],
        fixesApplied: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setIsRunning(false);
    setProgress('');
  }, [firestore, options]);

  const handleApplyFix = useCallback(async (issue: ReconciliationIssue) => {
    if (!firestore || !issue.canAutoFix) return;

    setApplyingFix(issue.id);
    try {
      const result = await applyAutoFix(firestore, issue);
      if (result.success) {
        // Update the report to reflect the fix
        setReport(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            fixesApplied: prev.fixesApplied + 1,
            issues: prev.issues.map(i =>
              i.id === issue.id
                ? { ...i, canAutoFix: false, suggestedFix: `[FIXED] ${result.message}` }
                : i
            ),
          };
        });
      }
    } catch (error) {
      console.error('Failed to apply fix:', error);
    }
    setApplyingFix(null);
  }, [firestore]);

  const toggleOption = (key: keyof ReconciliationOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group issues by category
  const issuesByCategory = report?.issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<IssueCategory, ReconciliationIssue[]>) || {};

  const totalIssues = report?.issues.length || 0;
  const criticalCount = report?.summary.issuesCount.critical || 0;
  const errorCount = report?.summary.issuesCount.error || 0;
  const warningCount = report?.summary.issuesCount.warning || 0;
  const infoCount = report?.summary.issuesCount.info || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Database Reconciliation</h1>
          <p className="text-muted-foreground">
            Check and fix data consistency across customers, subscriptions, and advertisements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleQuickCheck}
            disabled={quickCheckLoading || isRunning}
          >
            {quickCheckLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Quick Check
          </Button>
          <Button
            onClick={handleRunReconciliation}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Full Reconciliation
          </Button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      {quickSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Customers"
            value={quickSummary.totalCustomers}
            subtitle={`${quickSummary.totalUsers} users total`}
            icon={Users}
          />
          <StatCard
            title="Active Subscriptions"
            value={quickSummary.totalActiveSubscriptions}
            subtitle={`${quickSummary.totalSubscriptions} total`}
            icon={Database}
          />
          <StatCard
            title="MRR"
            value={`$${quickSummary.calculatedMRR.toFixed(2)}`}
            subtitle={`$${quickSummary.calculatedARR.toFixed(2)} ARR`}
            icon={DollarSign}
            iconColor="text-green-500"
          />
          <StatCard
            title="Advertisements"
            value={quickSummary.totalAdvertisements}
            subtitle={`${quickSummary.totalLeads} leads`}
            icon={Megaphone}
          />
        </div>
      )}

      {/* Options & Running */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Reconciliation Options
          </CardTitle>
          <CardDescription>
            Select what to check and whether to apply automatic fixes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkCustomers"
                  checked={options.checkCustomers}
                  onCheckedChange={() => toggleOption('checkCustomers')}
                />
                <Label htmlFor="checkCustomers" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Check Customer Data
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkSubscriptions"
                  checked={options.checkSubscriptions}
                  onCheckedChange={() => toggleOption('checkSubscriptions')}
                />
                <Label htmlFor="checkSubscriptions" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Check Subscriptions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkRevenue"
                  checked={options.checkRevenue}
                  onCheckedChange={() => toggleOption('checkRevenue')}
                />
                <Label htmlFor="checkRevenue" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Check Revenue Data
                </Label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkAdvertisements"
                  checked={options.checkAdvertisements}
                  onCheckedChange={() => toggleOption('checkAdvertisements')}
                />
                <Label htmlFor="checkAdvertisements" className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Check Advertisements
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkLeads"
                  checked={options.checkLeads}
                  onCheckedChange={() => toggleOption('checkLeads')}
                />
                <Label htmlFor="checkLeads" className="flex items-center gap-2">
                  <Handshake className="h-4 w-4" />
                  Check Leads
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkUsers"
                  checked={options.checkUsers}
                  onCheckedChange={() => toggleOption('checkUsers')}
                />
                <Label htmlFor="checkUsers" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Check Users
                </Label>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoFix" className="text-base font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Enable Auto-Fix
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically apply safe fixes during reconciliation
                </p>
              </div>
              <Switch
                id="autoFix"
                checked={options.autoFixEnabled}
                onCheckedChange={() => toggleOption('autoFixEnabled')}
              />
            </div>
          </div>

          {isRunning && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">{progress}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      {report && (
        <>
          {/* Status Banner */}
          {report.status === 'completed' && (
            <Alert variant={criticalCount > 0 || errorCount > 0 ? 'destructive' : 'default'}>
              {criticalCount > 0 || errorCount > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : warningCount > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertTitle>
                Reconciliation Complete
                {report.fixesApplied > 0 && ` - ${report.fixesApplied} fixes applied`}
              </AlertTitle>
              <AlertDescription>
                Found {totalIssues} issue{totalIssues !== 1 ? 's' : ''}:
                {criticalCount > 0 && ` ${criticalCount} critical,`}
                {errorCount > 0 && ` ${errorCount} errors,`}
                {warningCount > 0 && ` ${warningCount} warnings,`}
                {infoCount > 0 && ` ${infoCount} informational`}
                {totalIssues === 0 && ' No issues found!'}
              </AlertDescription>
            </Alert>
          )}

          {report.status === 'failed' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Reconciliation Failed</AlertTitle>
              <AlertDescription>{report.error}</AlertDescription>
            </Alert>
          )}

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Customers"
              value={report.summary.totalCustomers}
              subtitle={`${report.summary.totalUsers} users`}
              icon={Users}
            />
            <StatCard
              title="Active Subscriptions"
              value={report.summary.totalActiveSubscriptions}
              subtitle={`${report.summary.totalSubscriptions} total`}
              icon={Database}
            />
            <StatCard
              title="Calculated MRR"
              value={`$${report.summary.calculatedMRR.toFixed(2)}`}
              subtitle={`$${report.summary.calculatedARR.toFixed(2)} ARR`}
              icon={DollarSign}
              iconColor="text-green-500"
            />
            <StatCard
              title="Issues Found"
              value={totalIssues}
              subtitle={`${report.issues.filter(i => i.canAutoFix).length} fixable`}
              icon={FileWarning}
              iconColor={criticalCount > 0 || errorCount > 0 ? 'text-red-500' : warningCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}
            />
          </div>

          {/* Issues by Category */}
          {totalIssues > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="h-5 w-5" />
                  Issues Found
                </CardTitle>
                <CardDescription>
                  Review and fix data consistency issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={Object.keys(issuesByCategory)[0] || 'all'}>
                  <TabsList className="mb-4">
                    {(Object.entries(issuesByCategory) as [IssueCategory, ReconciliationIssue[]][]).map(([category, issues]) => (
                      <TabsTrigger key={category} value={category}>
                        {ISSUE_CATEGORY_LABELS[category]} ({issues.length})
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {(Object.entries(issuesByCategory) as [IssueCategory, ReconciliationIssue[]][]).map(([category, issues]) => (
                    <TabsContent key={category} value={category}>
                      <Accordion type="multiple" className="w-full">
                        {issues.map((issue: ReconciliationIssue) => (
                          <AccordionItem key={issue.id} value={issue.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3 flex-1">
                                <SeverityBadge severity={issue.severity} />
                                <span className="font-medium text-left">{issue.title}</span>
                                {issue.canAutoFix && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <Wrench className="h-3 w-3 mr-1" />
                                    Auto-fixable
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pl-2">
                                <p className="text-muted-foreground">{issue.description}</p>

                                {issue.affectedEntityId && (
                                  <div className="text-sm">
                                    <span className="font-medium">Affected: </span>
                                    <code className="bg-muted px-2 py-0.5 rounded">
                                      {issue.affectedEntityType}: {issue.affectedEntityId}
                                    </code>
                                  </div>
                                )}

                                {issue.suggestedFix && (
                                  <div className="bg-muted p-3 rounded-lg">
                                    <p className="text-sm font-medium mb-1">Suggested Fix:</p>
                                    <p className="text-sm text-muted-foreground">{issue.suggestedFix}</p>
                                  </div>
                                )}

                                {issue.metadata && Object.keys(issue.metadata).length > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Additional Details:</span>
                                    <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-auto">
                                      {JSON.stringify(issue.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {issue.canAutoFix && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApplyFix(issue)}
                                    disabled={applyingFix === issue.id}
                                  >
                                    {applyingFix === issue.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Wrench className="h-4 w-4 mr-2" />
                                    )}
                                    Apply Fix
                                  </Button>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* All Clear */}
          {totalIssues === 0 && report.status === 'completed' && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Data is Consistent</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No issues were found during the reconciliation check. Your database is in good health.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Initial State */}
      {!report && !quickSummary && !isRunning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Run a Reconciliation Check</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              This tool will scan your database for inconsistencies between customers, subscriptions,
              advertisements, and revenue metrics. Use "Quick Check" for a summary or "Run Full Reconciliation"
              for a detailed analysis with auto-fix options.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleQuickCheck}>
                <Activity className="h-4 w-4 mr-2" />
                Quick Check
              </Button>
              <Button onClick={handleRunReconciliation}>
                <Play className="h-4 w-4 mr-2" />
                Run Full Reconciliation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
