import JSZip from 'jszip';
import { format } from 'date-fns';

/**
 * Convert a Firestore timestamp to an ISO string, or return empty string
 */
function toDateString(ts: any): string {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'string') return ts;
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  return '';
}

/**
 * Convert an array of objects to CSV string
 */
function toCSV(rows: Record<string, any>[], columns: { key: string; label: string }[]): string {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const lines = rows.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '""';
      if (Array.isArray(val)) return `"${val.join('; ')}"`;
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

// ── Lead Export ─────────────────────────────────────────────

const LEAD_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'businessName', label: 'Business Name' },
  { key: 'contactName', label: 'Contact Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'siteCoverage', label: 'Site Coverage' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'leadScore', label: 'Lead Score' },
  { key: 'source', label: 'Source' },
  { key: 'sourceDetail', label: 'Source Detail' },
  { key: 'utmSource', label: 'UTM Source' },
  { key: 'utmMedium', label: 'UTM Medium' },
  { key: 'utmCampaign', label: 'UTM Campaign' },
  { key: 'utmTerm', label: 'UTM Term' },
  { key: 'utmContent', label: 'UTM Content' },
  { key: 'convertedToCustomerId', label: 'Converted To Customer ID' },
  { key: 'convertedAt', label: 'Converted At' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'assignedToName', label: 'Assigned To Name' },
  { key: 'estimatedValue', label: 'Estimated Value' },
  { key: 'notes', label: 'Notes' },
  { key: 'discountEmailSent', label: 'Discount Email Sent' },
  { key: 'lastContactedAt', label: 'Last Contacted At' },
  { key: 'snoozedUntil', label: 'Snoozed Until' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

function normalizeLeadRow(lead: any): Record<string, any> {
  return {
    id: lead.id || '',
    businessName: lead.businessName || '',
    contactName: lead.contactName || '',
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    siteCoverage: lead.siteCoverage || [],
    priority: lead.priority || 'medium',
    status: lead.status || 'active',
    leadScore: lead.leadScore ?? '',
    source: lead.source || 'website',
    sourceDetail: lead.sourceDetail || '',
    utmSource: lead.utmSource || '',
    utmMedium: lead.utmMedium || '',
    utmCampaign: lead.utmCampaign || '',
    utmTerm: lead.utmTerm || '',
    utmContent: lead.utmContent || '',
    convertedToCustomerId: lead.convertedToCustomerId || '',
    convertedAt: toDateString(lead.convertedAt),
    assignedTo: lead.assignedTo || '',
    assignedToName: lead.assignedToName || '',
    estimatedValue: lead.estimatedValue ?? '',
    notes: lead.notes || '',
    discountEmailSent: lead.discountEmailSent ? 'Yes' : 'No',
    lastContactedAt: toDateString(lead.lastContactedAt),
    snoozedUntil: toDateString(lead.snoozedUntil),
    createdAt: toDateString(lead.createdAt),
    updatedAt: toDateString(lead.updatedAt),
  };
}

// ── Advertisement Export ────────────────────────────────────

const AD_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'userId', label: 'User ID' },
  { key: 'subscriptionId', label: 'Subscription ID' },
  { key: 'status', label: 'Status' },
  { key: 'businessName', label: 'Business Name' },
  { key: 'contactName', label: 'Contact Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'cellPhone', label: 'Cell Phone' },
  { key: 'businessPhone', label: 'Business Phone' },
  { key: 'adWebsiteUrl', label: 'Website URL' },
  { key: 'adTitle', label: 'Ad Title' },
  { key: 'adText', label: 'Ad Text' },
  { key: 'adNotes', label: 'Ad Notes' },
  { key: 'adProofUrl', label: 'Ad Proof URL' },
  { key: 'adProofDestinationUrl', label: 'Ad Click URL' },
  { key: 'logoUrl', label: 'Logo URL' },
  { key: 'customerSampleAdUrl', label: 'Customer Sample Ad URL' },
  { key: 'customerUploads', label: 'Customer Uploads' },
  { key: 'requestCustomDesign', label: 'Requested Custom Design' },
  { key: 'revisionCount', label: 'Revision Count' },
  { key: 'revisionNotes', label: 'Revision Notes' },
  { key: 'isChangeRequest', label: 'Is Change Request' },
  { key: 'changeRequestType', label: 'Change Request Type' },
  { key: 'parentAdId', label: 'Parent Ad ID' },
  { key: 'liveAdId', label: 'Live Ad ID' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'notes', label: 'Admin Notes' },
  { key: 'infoSubmittedAt', label: 'Info Submitted At' },
  { key: 'designSubmittedAt', label: 'Design Submitted At' },
  { key: 'sentForApprovalAt', label: 'Sent For Approval At' },
  { key: 'approvedAt', label: 'Approved At' },
  { key: 'liveAt', label: 'Live At' },
  { key: 'pausedAt', label: 'Paused At' },
  { key: 'completedAt', label: 'Completed At' },
  { key: 'canceledAt', label: 'Canceled At' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

function normalizeAdRow(ad: any): Record<string, any> {
  return {
    id: ad.id || '',
    userId: ad.userId || '',
    subscriptionId: ad.subscriptionId || '',
    status: ad.status || '',
    businessName: ad.businessName || '',
    contactName: ad.contactName || '',
    email: ad.email || '',
    phone: ad.phone || '',
    cellPhone: ad.cellPhone || '',
    businessPhone: ad.businessPhone || '',
    adWebsiteUrl: ad.adWebsiteUrl || '',
    adTitle: ad.adTitle || '',
    adText: ad.adText || '',
    adNotes: ad.adNotes || '',
    adProofUrl: ad.adProofUrl || '',
    adProofDestinationUrl: ad.adProofDestinationUrl || '',
    logoUrl: ad.logoUrl || '',
    customerSampleAdUrl: ad.customerSampleAdUrl || '',
    customerUploads: ad.customerUploads || [],
    requestCustomDesign: ad.requestCustomDesign ? 'Yes' : 'No',
    revisionCount: ad.revisionCount ?? 0,
    revisionNotes: ad.revisionNotes || '',
    isChangeRequest: ad.isChangeRequest ? 'Yes' : 'No',
    changeRequestType: ad.changeRequestType || '',
    parentAdId: ad.parentAdId || '',
    liveAdId: ad.liveAdId || ad.pushedToAdServerId || '',
    impressions: ad.impressions ?? 0,
    clicks: ad.clicks ?? 0,
    notes: ad.notes || '',
    infoSubmittedAt: toDateString(ad.infoSubmittedAt),
    designSubmittedAt: toDateString(ad.designSubmittedAt),
    sentForApprovalAt: toDateString(ad.sentForApprovalAt),
    approvedAt: toDateString(ad.approvedAt),
    liveAt: toDateString(ad.liveAt),
    pausedAt: toDateString(ad.pausedAt),
    completedAt: toDateString(ad.completedAt),
    canceledAt: toDateString(ad.canceledAt),
    createdAt: toDateString(ad.createdAt),
    updatedAt: toDateString(ad.updatedAt),
  };
}

// ── Zip & Download ──────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export leads to a zip file containing:
 * - leads.csv (all lead data)
 * - leads.json (raw JSON for programmatic use)
 */
export async function exportLeadsZip(leads: any[]): Promise<void> {
  const zip = new JSZip();
  const dateStr = format(new Date(), 'yyyy-MM-dd');

  const rows = leads.map(normalizeLeadRow);
  zip.file('leads.csv', toCSV(rows, LEAD_COLUMNS));
  zip.file('leads.json', JSON.stringify(rows, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `leads-export-${dateStr}.zip`);
}

/**
 * Export advertisements to a zip file containing:
 * - advertisements.csv (all ad data)
 * - advertisements.json (raw JSON for programmatic use)
 */
export async function exportAdvertisementsZip(advertisements: any[]): Promise<void> {
  const zip = new JSZip();
  const dateStr = format(new Date(), 'yyyy-MM-dd');

  // Get full ad data from raw Firestore docs
  const rows = advertisements.map(normalizeAdRow);
  zip.file('advertisements.csv', toCSV(rows, AD_COLUMNS));
  zip.file('advertisements.json', JSON.stringify(rows, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `advertisements-export-${dateStr}.zip`);
}
