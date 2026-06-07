'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import { 
  Mail, Search, RefreshCw, Send, CheckCircle2, AlertTriangle, 
  Clock, X, Plus, Trash2, Paperclip, Eye, EyeOff, LayoutTemplate, 
  FileText, Play, ChevronRight, Info, AlertCircle, Sparkles, Image, Check
} from 'lucide-react';
import { AppSidebar } from "@/app/components/app-sidebar";
import { useRoleAccess } from "@/app/components/providers/role-access-provider";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Type definitions
interface Region {
  id: number;
  name: string;
}

interface University {
  id: number;
  name: string;
  regionId: number;
}

interface SmallGroup {
  id: number;
  name: string;
  universityId: number;
}

interface Province {
  id: number;
  name: string;
}

interface GraduateGroup {
  id: number;
  name: string;
  provinceId: number | null;
}

interface Campaign {
  id: number;
  subject: string;
  body: string;
  status: 'PENDING' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  totalCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  actualFailedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RecipientLog {
  id: number;
  campaignId: number;
  recipientEmail: string;
  recipientName: string;
  recipientType: string;
  recipientId: number | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface CustomRecipient {
  name: string;
  email: string;
  type: 'custom';
}

const PILLAR_LABELS: Record<string, string> = {
  mobilization_integration: 'Mobilization & Integration',
  capacity_building: 'Capacity Building',
  event_planning_management: 'Event Planning & Management',
  graduate_cell_management: 'Graduate Cell Management',
  social_cohesion_promotion: 'Social Cohesion Promotion',
  prayer_promotion: 'Prayer Promotion',
  database_management: 'Database Management',
};

export default function BulkEmailingPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { userRole, isLoading: roleLoading } = useRoleAccess();

  // Tab State
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Filter Dropdowns Metadata
  const [filtersData, setFiltersData] = useState<{
    regions: Region[];
    universities: University[];
    smallGroups: SmallGroup[];
    provinces: Province[];
    graduateSmallGroups: GraduateGroup[];
  }>({
    regions: [],
    universities: [],
    smallGroups: [],
    provinces: [],
    graduateSmallGroups: [],
  });

  // Selected Filters
  const [targetGroup, setTargetGroup] = useState<'all' | 'students' | 'graduates' | 'custom' | 'migrating'>('all');
  
  // Student Filters
  const [studentRegionId, setStudentRegionId] = useState<string>('');
  const [studentUnivId, setStudentUnivId] = useState<string>('');
  const [studentGroupId, setStudentGroupId] = useState<string>('');
  const [studentSex, setStudentSex] = useState<string>('');
  const [studentStatus, setStudentStatus] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [studentIntakeYear, setStudentIntakeYear] = useState<string>('');

  // Graduate Filters
  const [gradProvinceId, setGradProvinceId] = useState<string>('');
  const [gradGroupId, setGradGroupId] = useState<string>('');
  const [gradSex, setGradSex] = useState<string>('');
  const [gradStatus, setGradStatus] = useState<string>('');
  const [financialSupport, setFinancialSupport] = useState<string>('');
  const [isDiaspora, setIsDiaspora] = useState<string>('');
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [gradYearFrom, setGradYearFrom] = useState<string>('');
  const [gradYearTo, setGradYearTo] = useState<string>('');

  // Custom Recipients List
  const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomEmail, setNewCustomEmail] = useState('');
  const [customPasteArea, setCustomPasteArea] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);

  // Email Content
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<{ name: string; type: string; base64: string; size: string }[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Recipient Count state
  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [countingLoading, setCountingLoading] = useState(false);

  // Specific Names Selection State
  const [contactsList, setContactsList] = useState<{ id: number; name: string; email: string; type: string; status: string }[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [excludedEmails, setExcludedEmails] = useState<string[]>([]);
  const [contactsSearch, setContactsSearch] = useState('');
  const [showContactsList, setShowContactsList] = useState(false);

  // Campaign History State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recentSent24h, setRecentSent24h] = useState<number>(0);

  // Detailed Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipientLogs, setRecipientLogs] = useState<RecipientLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilterStatus, setLogsFilterStatus] = useState<'ALL' | 'SENT' | 'PENDING' | 'FAILED'>('ALL');
  const [modalTab, setModalTab] = useState<'recipients' | 'message'>('recipients');

  // Resend / Exclusion campaign state
  const [excludeCampaignId, setExcludeCampaignId] = useState<number | null>(null);
  const [excludeCampaignSubject, setExcludeCampaignSubject] = useState<string | null>(null);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignSuccessData, setCampaignSuccessData] = useState<{ totalCount: number } | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  // Cloudinary image upload states
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Signature and Template text preview helper
  const logoUrl = '/logo-r.png';
  const gburOfficeInfo = `
    <h3 style="margin-top: 0; margin-bottom: 12px; color: #334155; font-size: 14px; font-weight: 600;">Groupe Biblique Universitaire du Rwanda (GBUR)</h3>
    <p style="margin: 4px 0;"><strong>Head Office:</strong> Kigali, Rwanda | Gasabo District, Kacyiru | Cell: Kamutwa</p>
    <p style="margin: 4px 0;"><strong>P.O Box:</strong> 1116 Kigali</p>
    <div style="height: 12px;"></div>
    <p style="margin: 4px 0;"><strong>Tel:</strong> +250 786 030 841</p>
    <p style="margin: 4px 0;"><strong>Email:</strong> <span style="color: #64748b;">To be updated</span></p>
    <p style="margin: 4px 0;"><strong>Website:</strong> <a href="http://www.gburwanda.com" style="color: #2563eb; text-decoration: none;">www.gburwanda.com</a></p>
  `;

  // Cascading lists
  const filteredUniversities = filtersData.universities.filter(u => 
    !studentRegionId || u.regionId === Number(studentRegionId)
  );

  const filteredSmallGroups = filtersData.smallGroups.filter(g => 
    !studentUnivId || g.universityId === Number(studentUnivId)
  );

  const filteredGraduateGroups = filtersData.graduateSmallGroups.filter(g => 
    !gradProvinceId || g.provinceId === Number(gradProvinceId)
  );

  // Fetch cascading filters metadata on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await axios.get('/api/admin/emails/filters');
        setFiltersData(response.data);
      } catch (err) {
        console.error('Error fetching filter lists:', err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch sent emails count in last 24h helper
  const fetchSentCount24h = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/emails/campaigns?limit=1');
      // Calculate from custom helper, or we can mock it by querying recent campaign logs
      // For this system, we can just fetch the recent sent count
      // Or we can get it from a general stats endpoint, or calculate from recipient logs of campaigns sent in last 24h
      // Let's compute a close approximation or fetch it
      let count = 0;
      // We will set a reasonable mock or let it update dynamically when history is fetched
    } catch (err) {
      console.error('Error fetching sent count in 24h', err);
    }
  }, []);

  // Recipient Count Fetcher
  const updateRecipientCount = useCallback(async () => {
    if (targetGroup === 'custom') {
      setMatchingCount(customRecipients.length);
      return;
    }

    setCountingLoading(true);
    try {
      const payload = {
        targetGroup,
        excludeCampaignId: excludeCampaignId || undefined,
        studentFilters: {
          regionId: studentRegionId || undefined,
          universityId: studentUnivId || undefined,
          smallGroupId: studentGroupId || undefined,
          yearOfStudy: selectedYears.length > 0 ? selectedYears : undefined,
          sex: studentSex || undefined,
          status: studentStatus || undefined,
          intakeYear: studentIntakeYear || undefined,
        },
        graduateFilters: {
          provinceId: gradProvinceId || undefined,
          graduateGroupId: gradGroupId || undefined,
          servingPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
          sex: gradSex || undefined,
          status: gradStatus || undefined,
          financialSupport: financialSupport === 'yes' ? true : financialSupport === 'no' ? false : undefined,
          isDiaspora: isDiaspora === 'yes' ? true : isDiaspora === 'no' ? false : undefined,
          graduationYearFrom: gradYearFrom ? Number(gradYearFrom) : undefined,
          graduationYearTo: gradYearTo ? Number(gradYearTo) : undefined,
        }
      };

      const response = await axios.post('/api/admin/emails/count', payload);
      setMatchingCount(response.data.count);
    } catch (err) {
      console.error('Error counting recipients:', err);
    } finally {
      setCountingLoading(false);
    }
  }, [
    targetGroup, customRecipients, excludeCampaignId,
    studentRegionId, studentUnivId, studentGroupId, selectedYears, studentSex, studentStatus, studentIntakeYear,
    gradProvinceId, gradGroupId, selectedPillars, gradSex, gradStatus, financialSupport, isDiaspora, gradYearFrom, gradYearTo
  ]);

  // Update recipient count whenever filters change
  useEffect(() => {
    updateRecipientCount();
  }, [updateRecipientCount]);

  // Contacts List Fetcher
  const fetchContacts = useCallback(async () => {
    if (targetGroup === 'custom') {
      setContactsList([]);
      return;
    }

    setContactsLoading(true);
    try {
      const payload = {
        targetGroup,
        excludeCampaignId: excludeCampaignId || undefined,
        studentFilters: {
          regionId: studentRegionId || undefined,
          universityId: studentUnivId || undefined,
          smallGroupId: studentGroupId || undefined,
          yearOfStudy: selectedYears.length > 0 ? selectedYears : undefined,
          sex: studentSex || undefined,
          status: studentStatus || undefined,
          intakeYear: studentIntakeYear || undefined,
        },
        graduateFilters: {
          provinceId: gradProvinceId || undefined,
          graduateGroupId: gradGroupId || undefined,
          servingPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
          sex: gradSex || undefined,
          status: gradStatus || undefined,
          financialSupport: financialSupport === 'yes' ? true : financialSupport === 'no' ? false : undefined,
          isDiaspora: isDiaspora === 'yes' ? true : isDiaspora === 'no' ? false : undefined,
          graduationYearFrom: gradYearFrom ? Number(gradYearFrom) : undefined,
          graduationYearTo: gradYearTo ? Number(gradYearTo) : undefined,
        }
      };

      const response = await axios.post('/api/admin/emails/contacts', payload);
      setContactsList(response.data.contacts || []);
    } catch (err) {
      console.error('Error fetching contacts list:', err);
    } finally {
      setContactsLoading(false);
    }
  }, [
    targetGroup, excludeCampaignId,
    studentRegionId, studentUnivId, studentGroupId, selectedYears, studentSex, studentStatus, studentIntakeYear,
    gradProvinceId, gradGroupId, selectedPillars, gradSex, gradStatus, financialSupport, isDiaspora, gradYearFrom, gradYearTo
  ]);

  // Trigger contacts fetch and reset exclusions when target group or filters change
  useEffect(() => {
    setExcludedEmails([]);
    if (showContactsList) {
      fetchContacts();
    }
  }, [
    targetGroup, excludeCampaignId,
    studentRegionId, studentUnivId, studentGroupId, selectedYears, studentSex, studentStatus, studentIntakeYear,
    gradProvinceId, gradGroupId, selectedPillars, gradSex, gradStatus, financialSupport, isDiaspora, gradYearFrom, gradYearTo,
    showContactsList, fetchContacts
  ]);

  // Fetch campaign history
  const fetchCampaignHistory = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const response = await axios.get(`/api/admin/emails/campaigns?page=${currentPage}&limit=10`);
      setCampaigns(response.data.campaigns);
      setTotalPages(response.data.pagination.totalPages);
      
      // Calculate total sent in last 24h from retrieved history
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      let totalSent24h = 0;
      response.data.campaigns.forEach((c: Campaign) => {
        if (new Date(c.createdAt).getTime() >= oneDayAgo) {
          totalSent24h += c.sentCount;
        }
      });
      setRecentSent24h(totalSent24h);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setCampaignsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchCampaignHistory();
    }
  }, [activeTab, fetchCampaignHistory]);

  // Fetch detailed recipient logs for modal
  const fetchCampaignLogs = async (campaignId: number) => {
    setLogsLoading(true);
    setModalTab('recipients');
    try {
      const response = await axios.get(`/api/admin/emails/campaigns/${campaignId}`);
      setSelectedCampaign(response.data.campaign);
      setRecipientLogs(response.data.campaign.recipients || []);
    } catch (err) {
      console.error('Error fetching campaign logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Convert uploaded attachments to base64
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          base64,
          size: sizeStr
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Cloudinary image upload inside text composer
  const handleComposerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      // 1. Get Signature from backend
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
      if (!signRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, apiKey, cloudName } = await signRes.json();

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const data = await uploadRes.json();
      
      // Insert img tag to email body
      const imgTag = `<img src="${data.secure_url}" alt="Image upload" style="max-width: 100%; border-radius: 8px; margin: 16px 0; display: block;" />\n`;
      setEmailBody(prev => prev + imgTag);
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      alert("Failed to upload image. Please verify Cloudinary configuration.");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Add custom recipient manually
  const handleAddCustom = () => {
    if (!newCustomName.trim() || !newCustomEmail.trim() || !newCustomEmail.includes('@')) {
      alert('Please provide a valid Name and Email address.');
      return;
    }
    setCustomRecipients(prev => [...prev, {
      name: newCustomName.trim(),
      email: newCustomEmail.trim().toLowerCase(),
      type: 'custom'
    }]);
    setNewCustomName('');
    setNewCustomEmail('');
  };

  // Paste a batch of custom recipients
  const handlePasteCustom = () => {
    if (!customPasteArea.trim()) return;

    const lines = customPasteArea.split(/[\n,;]+/);
    const parsed: CustomRecipient[] = [];

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      const angleMatch = cleanLine.match(/^([^<]+)<([^>]+)>$/) || cleanLine.match(/^()([^\s<>]+@[^\s<>]+)$/);
      if (angleMatch) {
        const name = angleMatch[1].trim() || angleMatch[2].split('@')[0];
        const email = angleMatch[2].trim().toLowerCase();
        if (email.includes('@')) {
          parsed.push({ name, email, type: 'custom' });
        }
      } else if (cleanLine.includes('@')) {
        parsed.push({
          name: cleanLine.split('@')[0],
          email: cleanLine.toLowerCase(),
          type: 'custom'
        });
      }
    });

    if (parsed.length === 0) {
      alert('Could not parse any valid emails from your input. Ensure they contain "@" symbol.');
      return;
    }

    setCustomRecipients(prev => [...prev, ...parsed]);
    setCustomPasteArea('');
    setShowPasteInput(false);
  };

  const removeCustomRecipient = (index: number) => {
    setCustomRecipients(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle year of study multiselect
  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  // Toggle serving pillar multiselect
  const togglePillar = (pillar: string) => {
    setSelectedPillars(prev => 
      prev.includes(pillar) ? prev.filter(p => p !== pillar) : [...prev, pillar]
    );
  };

  // Send Campaign Post API
  const handleSendCampaign = async () => {
    if (!subject.trim()) {
      alert('Please specify an email Subject.');
      return;
    }
    if (!emailBody.trim()) {
      alert('Please compose your email Body.');
      return;
    }
    const finalSelectedCount = targetGroup === 'custom' ? customRecipients.length : (matchingCount - excludedEmails.length);
    if (finalSelectedCount <= 0) {
      alert('No recipients selected. Please adjust your filters, custom list, or check selected names.');
      return;
    }

    setSendingCampaign(true);
    setCampaignError(null);
    try {
      const payload = {
        subject,
        body: emailBody,
        filters: {
          targetGroup,
          excludeCampaignId: excludeCampaignId || undefined,
          studentFilters: {
            regionId: studentRegionId || undefined,
            universityId: studentUnivId || undefined,
            smallGroupId: studentGroupId || undefined,
            yearOfStudy: selectedYears.length > 0 ? selectedYears : undefined,
            sex: studentSex || undefined,
            status: studentStatus || undefined,
            intakeYear: studentIntakeYear || undefined,
          },
          graduateFilters: {
            provinceId: gradProvinceId || undefined,
            graduateGroupId: gradGroupId || undefined,
            servingPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
            sex: gradSex || undefined,
            status: gradStatus || undefined,
            financialSupport: financialSupport === 'yes' ? true : financialSupport === 'no' ? false : undefined,
            isDiaspora: isDiaspora === 'yes' ? true : isDiaspora === 'no' ? false : undefined,
            graduationYearFrom: gradYearFrom ? Number(gradYearFrom) : undefined,
            graduationYearTo: gradYearTo ? Number(gradYearTo) : undefined,
          },
          excludedEmails: excludedEmails.length > 0 ? excludedEmails : undefined
        },
        customRecipients: targetGroup === 'custom' ? customRecipients : undefined,
        attachments: attachments.map(att => ({
          filename: att.name,
          content: att.base64,
          contentType: att.type
        }))
      };

      const response = await axios.post('/api/admin/emails/send', payload);
      
      if (response.data.success) {
        // Show inline success in modal — no browser alert
        setCampaignSuccessData({ totalCount: response.data.totalCount });
        // Reset compose state but keep modal open to show success
        setSubject('');
        setEmailBody('');
        setAttachments([]);
        setCustomRecipients([]);
        setExcludedEmails([]);
        setExcludeCampaignId(null);
        setExcludeCampaignSubject(null);
      }
    } catch (err: any) {
      console.error('Error sending campaign:', err);
      setCampaignError(err.response?.data?.error || 'Failed to start email campaign. Check SMTP credentials or limits.');
    } finally {
      setSendingCampaign(false);
    }
  };

  // Resend / copy campaign logic
  const handleResendCampaignInit = (camp: Campaign) => {
    setSubject(camp.subject);
    setEmailBody(camp.body);
    setExcludeCampaignId(camp.id);
    setExcludeCampaignSubject(camp.subject);
    setActiveTab('compose');
  };

  // Campaign Control Actions (Resume / Retry Failed / Retry Single)
  const handleCampaignAction = async (campaignId: number, action: 'resume' | 'retry_failed') => {
    try {
      const response = await axios.post('/api/admin/emails/campaigns', { campaignId, action });
      if (response.data.success) {
        alert(response.data.message || 'Action executed successfully');
        fetchCampaignHistory();
        if (selectedCampaign && selectedCampaign.id === campaignId) {
          fetchCampaignLogs(campaignId);
        }
      }
    } catch (err: any) {
      console.error(`Error executing ${action} campaign:`, err);
      alert(err.response?.data?.error || 'Failed to execute action.');
    }
  };

  const handleRetrySingle = async (logId: number) => {
    if (!selectedCampaign) return;
    try {
      const response = await axios.post(`/api/admin/emails/campaigns/${selectedCampaign.id}`, {
        action: 'retry_single',
        logId
      });
      if (response.data.success) {
        alert('Retrying email delivery...');
        fetchCampaignLogs(selectedCampaign.id);
        fetchCampaignHistory();
      }
    } catch (err: any) {
      console.error('Error retrying recipient:', err);
      alert(err.response?.data?.error || 'Failed to retry delivery.');
    }
  };

  // Helper formatting for composer toolbar insertion
  const insertTextMarkup = (openTag: string, closeTag: string) => {
    const textarea = document.getElementById('bodyTextarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = openTag + selected + closeTag;

    setEmailBody(text.substring(0, start) + replacement + text.substring(end));
    
    // Focus back on textarea after state updates
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    }, 50);
  };

  // Authorization and load check states
  if (roleLoading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="text-muted-foreground font-medium text-sm">Loading security keys...</span>
        </div>
      </div>
    );
  }

  const allowedRoles = ['superadmin', 'national', 'region', 'university'];
  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4 text-center">
        <div className="max-w-md bg-card border border-border/40 rounded-xl p-8 shadow-sm">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Your current administrative privilege does not permit access to Bulk Emailing controls. Region-admin scopes or higher are required.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-all duration-200">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Filter logs inside modal
  const filteredRecipientLogs = recipientLogs.filter((log) => {
    const matchesSearch = 
      log.recipientEmail.toLowerCase().includes(logsSearch.toLowerCase()) ||
      log.recipientName.toLowerCase().includes(logsSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    if (logsFilterStatus === 'ALL') return true;
    return log.status === logsFilterStatus;
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Breadcrumb Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border/40">
          <div className="flex items-center gap-2 px-4 w-full justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <span className="text-muted-foreground">Admin</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Bulk Emailing</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            {/* Live Indicator (only visible to Superadmin/National in Compose screen) */}
            {activeTab === 'compose' && (
              <div className="hidden lg:flex items-center gap-2 text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-full">
                <Info className="w-3.5 h-3.5" />
                <span>Daily protection active: max 450 emails/day recommended</span>
              </div>
            )}
          </div>
        </header>

        {/* Outer container */}
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          
          {/* Main Title Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Bulk Emailing System</h1>
                <Sparkles className="w-5 h-5 text-sky-500 hidden sm:inline" />
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Draft professional announcements, filter contacts, and deliver mass communications safely with Gmail SMTP protection.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-muted/40 border border-border/60 p-1.5 rounded-xl self-stretch md:self-auto">
              <button
                onClick={() => setActiveTab('compose')}
                className={`flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === 'compose' 
                    ? 'bg-card text-foreground shadow-sm border border-border/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutTemplate className="w-4 h-4" />
                Compose Campaign
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === 'history' 
                    ? 'bg-card text-foreground shadow-sm border border-border/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-4 h-4" />
                Campaign History
              </button>
            </div>
          </div>

          {/* TAB 1: COMPOSE PANEL */}
          {activeTab === 'compose' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
              {excludeCampaignId && (
                <div className="lg:col-span-12 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 p-4 rounded-xl flex items-center justify-between text-xs font-semibold gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      Resend Mode: Excluding contacts who already successfully received Campaign #{excludeCampaignId} ("{excludeCampaignSubject}").
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setExcludeCampaignId(null);
                      setExcludeCampaignSubject(null);
                    }}
                    className="text-muted-foreground hover:text-foreground underline shrink-0 cursor-pointer text-xs"
                  >
                    Clear Resend Mode
                  </button>
                </div>
              )}
              
              {/* Left Column: Editor & Filters (7 Columns) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* 1. Recipient Filtering Card */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-muted/30 border-b border-border/60 px-5 py-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-sky-500" />
                      1. Select Target Recipients
                    </h2>
                    
                    {/* Live Count Indicator */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {targetGroup !== 'custom' && excludedEmails.length > 0 ? 'Selected Contacts:' : 'Matching Contacts:'}
                      </span>
                      <div className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all duration-300 ${
                        countingLoading 
                          ? 'bg-muted text-muted-foreground animate-pulse' 
                          : (targetGroup === 'custom' ? customRecipients.length : (matchingCount - excludedEmails.length)) > 0 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                      }`}>
                        {countingLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (targetGroup === 'custom' ? customRecipients.length : (matchingCount - excludedEmails.length)) > 0 
                                ? 'bg-emerald-500 animate-ping' 
                                : 'bg-destructive'
                            }`}></span>
                            {targetGroup === 'custom' 
                              ? customRecipients.length 
                              : excludedEmails.length > 0 
                                ? `${matchingCount - excludedEmails.length} of ${matchingCount}` 
                                : matchingCount}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-4">
                    {/* Target Group Selector */}
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recipients Profile Group</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { id: 'all', label: 'All Contacts' },
                          { id: 'students', label: 'Students Only' },
                          { id: 'graduates', label: 'Graduates Only' },
                          { id: 'migrating', label: 'Migrating Members' },
                          { id: 'custom', label: 'Custom List' }
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => setTargetGroup(btn.id as any)}
                            className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all duration-200 ${
                              targetGroup === btn.id
                                ? 'bg-primary/5 text-primary border-primary shadow-sm'
                                : 'bg-background hover:bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Forms Container */}
                    {(targetGroup === 'all' || targetGroup === 'students' || targetGroup === 'migrating') && (
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-xl flex flex-col gap-3">
                        <div className="text-xs font-bold text-foreground border-b border-border/40 pb-1.5 flex items-center justify-between">
                          <span>Student Filter Sets</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Apply filters to target specific schools or regions</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Region */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Region</label>
                            <select
                              value={studentRegionId}
                              onChange={(e) => {
                                setStudentRegionId(e.target.value);
                                setStudentUnivId('');
                                setStudentGroupId('');
                              }}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All Regions</option>
                              {filtersData.regions.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* University */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">University</label>
                            <select
                              value={studentUnivId}
                              disabled={!studentRegionId && filtersData.regions.length > 0}
                              onChange={(e) => {
                                setStudentUnivId(e.target.value);
                                setStudentGroupId('');
                              }}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-50"
                            >
                              <option value="">All Universities</option>
                              {filteredUniversities.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Small Group */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Small Group (GBU)</label>
                            <select
                              value={studentGroupId}
                              disabled={!studentUnivId}
                              onChange={(e) => setStudentGroupId(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-50"
                            >
                              <option value="">All Small Groups</option>
                              {filteredSmallGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                          {/* Sex */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Sex</label>
                            <select
                              value={studentSex}
                              onChange={(e) => setStudentSex(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Student Status</label>
                            <select
                              value={targetGroup === 'migrating' ? 'migrating' : studentStatus}
                              disabled={targetGroup === 'migrating'}
                              onChange={(e) => setStudentStatus(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="">All Active Statuses</option>
                              <option value="active">Active</option>
                              <option value="migrating">Migrating</option>
                              <option value="inactive">Inactive</option>
                              <option value="mobilized">Mobilized</option>
                            </select>
                          </div>

                          {/* Year of Intake */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Year of Intake</label>
                            <select
                              value={studentIntakeYear}
                              onChange={(e) => setStudentIntakeYear(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All Intake Years</option>
                              {Array.from({ length: new Date().getFullYear() - 2018 + 1 }, (_, i) => {
                                const yr = new Date().getFullYear() - i;
                                return (
                                  <option key={yr} value={yr}>
                                    {yr}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* Year of study checkboxes */}
                        <div className="mt-1">
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Years of Study</label>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7].map((yr) => (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => toggleYear(yr)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                  selectedYears.includes(yr)
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-background hover:bg-muted/40 border border-border/80 text-muted-foreground'
                                }`}
                              >
                                Yr {yr}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {(targetGroup === 'all' || targetGroup === 'graduates') && (
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-xl flex flex-col gap-3">
                        <div className="text-xs font-bold text-foreground border-b border-border/40 pb-1.5 flex items-center justify-between">
                          <span>Graduate Filter Sets</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Apply filters to target specific provinces or alumni groups</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Province */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Province</label>
                            <select
                              value={gradProvinceId}
                              onChange={(e) => {
                                setGradProvinceId(e.target.value);
                                setGradGroupId('');
                              }}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All Provinces</option>
                              {filtersData.provinces.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Graduate Small Group */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Graduate Small Group (Alumni)</label>
                            <select
                              value={gradGroupId}
                              disabled={!gradProvinceId && filtersData.provinces.length > 0}
                              onChange={(e) => setGradGroupId(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-50"
                            >
                              <option value="">All Graduate Groups</option>
                              {filteredGraduateGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                          {/* Sex */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Sex</label>
                            <select
                              value={gradSex}
                              onChange={(e) => setGradSex(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                            <select
                              value={gradStatus}
                              onChange={(e) => setGradStatus(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All Active</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="moved">Moved Abroad</option>
                            </select>
                          </div>

                          {/* Financial Support */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Financial Supporter</label>
                            <select
                              value={financialSupport}
                              onChange={(e) => setFinancialSupport(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>

                          {/* Diaspora */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">In Diaspora</label>
                            <select
                              value={isDiaspora}
                              onChange={(e) => setIsDiaspora(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">All</option>
                              <option value="yes">Diaspora</option>
                              <option value="no">Local</option>
                            </select>
                          </div>
                        </div>

                        {/* Graduation Year Range */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Graduation Year From</label>
                            <select
                              value={gradYearFrom}
                              onChange={(e) => setGradYearFrom(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">From Year</option>
                              {Array.from({ length: new Date().getFullYear() - 1990 + 1 }, (_, i) => 1990 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Graduation Year To</label>
                            <select
                              value={gradYearTo}
                              onChange={(e) => setGradYearTo(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                            >
                              <option value="">To Year</option>
                              {Array.from({ length: new Date().getFullYear() - 1990 + 1 }, (_, i) => 1990 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {gradYearFrom && gradYearTo && Number(gradYearFrom) > Number(gradYearTo) && (
                          <div className="text-xs text-red-500 mt-1">
                            From Year cannot be greater than To Year
                          </div>
                        )}

                        {/* Serving Pillars Checklist */}
                        <div className="mt-1">
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Serving Ministry Pillars</label>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(PILLAR_LABELS).map(([key, label]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => togglePillar(key)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                  selectedPillars.includes(key)
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-background hover:bg-muted/40 border border-border/80 text-muted-foreground'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Specific Names Selection / refinement */}
                    {targetGroup !== 'custom' && matchingCount > 0 && (
                      <div className="mt-2 border border-border/40 rounded-xl p-4 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setShowContactsList(!showContactsList)}
                            className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                          >
                            {showContactsList ? 'Hide Individual Name Selection' : 'Refine Recipient List (Select specific names)'}
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                              {excludedEmails.length > 0 ? `${matchingCount - excludedEmails.length} selected` : 'All selected'}
                            </span>
                          </button>
                          
                          {showContactsList && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setExcludedEmails([])}
                                className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                              >
                                Select All
                              </button>
                              <span className="text-muted-foreground text-[10px]">|</span>
                              <button
                                type="button"
                                onClick={() => setExcludedEmails(contactsList.map(c => c.email))}
                                className="text-[10px] text-destructive hover:underline font-semibold"
                              >
                                Deselect All
                              </button>
                            </div>
                          )}
                        </div>

                        {showContactsList && (
                          <div className="mt-3 flex flex-col gap-3">
                            {/* Search bar */}
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground animate-none" />
                              <input
                                type="text"
                                placeholder="Search matching names or emails..."
                                value={contactsSearch}
                                onChange={(e) => setContactsSearch(e.target.value)}
                                className="pl-8 w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                              />
                            </div>

                            {/* Scrollable list */}
                            {contactsLoading ? (
                              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Loading matching contacts list...
                              </div>
                            ) : (
                              <div className="max-h-56 overflow-y-auto border border-border/40 rounded-lg bg-background divide-y divide-border/20">
                                {contactsList.filter(c => 
                                  c.name.toLowerCase().includes(contactsSearch.toLowerCase()) ||
                                  c.email.toLowerCase().includes(contactsSearch.toLowerCase())
                                ).length === 0 ? (
                                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                                    No contacts matching "{contactsSearch}"
                                  </div>
                                ) : (
                                  contactsList.filter(c => 
                                    c.name.toLowerCase().includes(contactsSearch.toLowerCase()) ||
                                    c.email.toLowerCase().includes(contactsSearch.toLowerCase())
                                  ).map((contact) => {
                                    const isSelected = !excludedEmails.includes(contact.email);
                                    return (
                                      <label
                                        key={`${contact.type}-${contact.id}`}
                                        className="flex items-center justify-between p-2.5 hover:bg-muted/30 cursor-pointer transition-colors text-xs"
                                      >
                                        <div className="flex items-center gap-2.5 truncate">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                              if (isSelected) {
                                                setExcludedEmails(prev => [...prev, contact.email]);
                                              } else {
                                                setExcludedEmails(prev => prev.filter(e => e !== contact.email));
                                              }
                                            }}
                                            className="rounded border-border/80 text-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                          />
                                          <div className="flex flex-col truncate">
                                            <span className="font-semibold text-foreground truncate">{contact.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono truncate">{contact.email}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                            contact.type === 'student' 
                                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' 
                                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                          }`}>
                                            {contact.type}
                                          </span>
                                          {contact.status && (
                                            <span className="text-[10px] text-muted-foreground capitalize">
                                              {contact.status}
                                            </span>
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Recipients Uploader Panel */}
                    {targetGroup === 'custom' && (
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-xl flex flex-col gap-3">
                        <div className="text-xs font-bold text-foreground border-b border-border/40 pb-1.5 flex items-center justify-between">
                          <span>Custom Contacts Registration</span>
                          <button
                            type="button"
                            onClick={() => setShowPasteInput(!showPasteInput)}
                            className="text-xs text-primary hover:underline font-semibold"
                          >
                            {showPasteInput ? 'Add Manually' : 'Paste Bulk List (CSV)'}
                          </button>
                        </div>

                        {showPasteInput ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              rows={4}
                              placeholder="Paste names and emails here. Format:\nJohn Doe <john@gmail.com>\nJane Smith <jane@gmail.com>\nor just email addresses separated by commas or lines."
                              value={customPasteArea}
                              onChange={(e) => setCustomPasteArea(e.target.value)}
                              className="w-full text-xs bg-background border border-border/80 rounded-lg p-2.5 focus:ring-1 focus:ring-primary/20 text-foreground font-mono"
                            />
                            <button
                              type="button"
                              onClick={handlePasteCustom}
                              className="bg-primary text-primary-foreground font-semibold text-xs py-2 rounded-lg hover:bg-primary/95 transition-all self-end px-4"
                            >
                              Parse and Add Bulk Recipients
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Name</label>
                              <input
                                type="text"
                                placeholder="E.g., Brother John"
                                value={newCustomName}
                                onChange={(e) => setNewCustomName(e.target.value)}
                                className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Email Address</label>
                              <input
                                type="email"
                                placeholder="john@domain.com"
                                value={newCustomEmail}
                                onChange={(e) => setNewCustomEmail(e.target.value)}
                                className="w-full text-xs bg-background border border-border/80 rounded-lg p-2 focus:ring-1 focus:ring-primary/20 text-foreground"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleAddCustom}
                              className="bg-muted border border-border/80 hover:bg-muted/80 text-foreground font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 h-[34px] justify-center"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add
                            </button>
                          </div>
                        )}

                        {/* List of Custom Recipients */}
                        {customRecipients.length > 0 && (
                          <div className="mt-2 border border-border/40 rounded-lg max-h-40 overflow-y-auto bg-background divide-y divide-border/40">
                            {customRecipients.map((rec, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 text-xs">
                                <div className="truncate pr-4 flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">{rec.name}</span>
                                  <span className="text-muted-foreground font-mono">({rec.email})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCustomRecipient(idx)}
                                  className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Composer Composition Card */}
                <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col gap-4">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
                    <FileText className="w-4 h-4 text-sky-500" />
                    2. Draft mass communication
                  </h2>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Campaign Email Subject</label>
                    <input
                      type="text"
                      placeholder="Enter subject heading..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full text-sm bg-background border border-border/80 rounded-lg p-2.5 focus:ring-1 focus:ring-primary/20 text-foreground font-medium"
                    />
                  </div>

                  {/* Body Editor Container */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Email HTML Body Content</label>
                      
                      {/* Rich Formatting Helper Toolbar */}
                      <div className="flex items-center gap-1 border border-border/60 rounded-md p-0.5 bg-muted/20">
                        <button
                          type="button"
                          onClick={() => insertTextMarkup('<strong>', '</strong>')}
                          className="px-2 py-0.5 text-xs font-extrabold hover:bg-muted text-foreground rounded transition-colors"
                          title="Bold Text"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTextMarkup('<em>', '</em>')}
                          className="px-2 py-0.5 text-xs italic hover:bg-muted text-foreground rounded transition-colors"
                          title="Italic Text"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTextMarkup('<h3>', '</h3>')}
                          className="px-1.5 py-0.5 text-xs font-bold hover:bg-muted text-foreground rounded transition-colors"
                          title="Heading H3"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTextMarkup('<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>', '')}
                          className="px-1.5 py-0.5 text-[10px] hover:bg-muted text-foreground rounded transition-colors"
                          title="Divider Line"
                        >
                          LINE
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTextMarkup('<a href="LINK" style="display: inline-block; padding: 10px 20px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">', '</a>')}
                          className="px-1.5 py-0.5 text-[10px] hover:bg-muted text-foreground rounded transition-colors font-semibold"
                          title="Styled Button Link"
                        >
                          BTN
                        </button>

                        {/* Image Insertion - Cloudinary sign upload */}
                        <div className="relative">
                          <button
                            type="button"
                            disabled={imageUploading}
                            onClick={() => imageInputRef.current?.click()}
                            className="px-1.5 py-0.5 hover:bg-muted text-foreground rounded transition-colors flex items-center justify-center disabled:opacity-50"
                            title="Insert Photo (Cloudinary upload)"
                          >
                            {imageUploading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Image className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <input
                            type="file"
                            ref={imageInputRef}
                            accept="image/*"
                            onChange={handleComposerImageUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <textarea
                      id="bodyTextarea"
                      rows={12}
                      placeholder="Compose your rich text or HTML body message here...\nTip: You can use the formatting helper toolbar above or raw HTML tags. Paragaphs can be wrapped in <p>...</p> tags."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full text-sm bg-background border border-border/80 rounded-lg p-3 focus:ring-1 focus:ring-primary/20 text-foreground font-mono leading-relaxed"
                    />
                  </div>

                  {/* 3. Attachments */}
                  <div className="border border-border/40 rounded-xl p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-sky-500" />
                        Campaign Attachments
                      </div>
                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        Add Files
                      </button>
                      <input
                        type="file"
                        multiple
                        ref={attachmentInputRef}
                        onChange={handleAttachmentUpload}
                        className="hidden"
                      />
                    </div>

                    {attachments.length > 0 ? (
                      <div className="flex flex-col gap-1.5 mt-2">
                        {attachments.map((file, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-card border border-border/40 rounded-lg text-xs">
                            <span className="truncate pr-4 font-semibold text-foreground">{file.name} ({file.size})</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-destructive hover:bg-destructive/10 p-1 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No attachments added yet.</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-2 self-end w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowPreviewMobile(!showPreviewMobile)}
                      className="flex-1 sm:flex-none justify-center border border-border/80 hover:bg-muted/40 font-semibold text-sm py-2.5 px-5 rounded-lg flex items-center gap-2 text-foreground lg:hidden"
                    >
                      {showPreviewMobile ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Show Preview
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const finalSelectedCount = targetGroup === 'custom' ? customRecipients.length : (matchingCount - excludedEmails.length);
                        if (finalSelectedCount <= 0) {
                          alert('No recipients selected. Please adjust your filters, custom list, or check selected names.');
                          return;
                        }
                        setShowConfirmModal(true);
                      }}
                      className="flex-1 sm:flex-none justify-center bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm py-2.5 px-6 rounded-lg flex items-center gap-2 shadow-sm transition-all duration-200"
                    >
                      <Send className="w-4 h-4" />
                      Create & Send Campaign
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: HTML Branded Preview (5 Columns) */}
              <div className={`lg:col-span-5 lg:block ${showPreviewMobile ? 'block' : 'hidden'}`}>
                <div className="sticky top-6 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="bg-muted/30 border-b border-border/60 px-5 py-4 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-sky-500" />
                    <h2 className="text-base font-bold text-foreground">Official Template Live Preview</h2>
                  </div>

                  {/* Mock Email Frame */}
                  <div className="p-3 bg-muted/10 border-b border-border/40 text-xs flex flex-col gap-1 text-muted-foreground">
                    <div><span className="font-semibold text-foreground">From:</span> GBUR Head Office</div>
                    <div><span className="font-semibold text-foreground">To:</span> <span className="bg-muted/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground font-bold">Matching contacts set</span></div>
                    <div className="truncate"><span className="font-semibold text-foreground">Subject:</span> <span className="text-foreground font-bold">{subject || '(Specify subject to preview)'}</span></div>
                  </div>

                  {/* Branded Scrollable Email Viewport */}
                  <div className="p-4 overflow-y-auto bg-slate-100 flex-1 min-h-[350px]">
                    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4 sm:p-6 text-sm text-slate-800 leading-relaxed font-sans">
                      
                      {/* Brand Logo Header */}
                      <div className="border-b-3 border-sky-600 pb-5 mb-6 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={logoUrl} 
                          alt="GBUR Logo" 
                          className="h-14 mx-auto object-contain block"
                          onError={(e) => {
                            // Fallback if logo not loaded locally
                            e.currentTarget.src = "https://res.cloudinary.com/dcu6qjld4/image/upload/v1716382100/logo_vwh9f1.png";
                          }}
                        />
                      </div>

                      {/* Subject title heading */}
                      <h2 className="text-lg font-extrabold text-slate-900 mb-4">{subject || 'Campaign Title Headline'}</h2>

                      {/* Live rich text body */}
                      <div 
                        className="email-body-preview min-h-[100px] break-words whitespace-pre-line"
                        dangerouslySetInnerHTML={{ 
                          __html: emailBody 
                            ? emailBody.replace(/\n/g, '<br/>') 
                            : '<p class="text-slate-400 italic">Start typing your message body on the left panel. Use simple tags like &lt;b&gt;, &lt;p&gt;, &lt;h3&gt; or lists for rich text formatting. Cloudinary image uploads will render inline beautifully.</p>' 
                        }}
                      />

                      {/* Divider signature */}
                      <div className="h-0 border-t border-slate-200 my-8"></div>

                      {/* Brand Footer Info */}
                      <div 
                        className="text-xs text-slate-500 font-sans leading-relaxed" 
                        dangerouslySetInnerHTML={{ __html: gburOfficeInfo }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAMPAIGN HISTORY */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-6 mt-4">
              
              {/* Stat Indicator cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Safe Protect daily limit meter */}
                <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gmail Protections (24h)</span>
                    <Info className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-2xl font-black text-foreground">{recentSent24h}</span>
                      <span className="text-xs text-muted-foreground">/ 450 limit</span>
                    </div>
                    {/* Safe Meter Progress bar */}
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          recentSent24h >= 400 
                            ? 'bg-destructive animate-pulse' 
                            : recentSent24h >= 300 
                              ? 'bg-amber-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (recentSent24h / 450) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Campaigns automatically **PAUSE** at 450 sent to prevent SMTP blocking.
                  </p>
                </div>

                {/* 2. Total Campaigns */}
                <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Campaigns</span>
                    <span className="text-3xl font-black text-foreground mt-1.5 block">
                      {campaignsLoading ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        campaigns.length
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-sky-500/10 text-sky-600 rounded-xl">
                    <Mail className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Completed Campaigns */}
                <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Completed Delivery</span>
                    <span className="text-3xl font-black text-foreground mt-1.5 block">
                      {campaigns.filter(c => c.status === 'COMPLETED').length}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. Alert / Paused */}
                <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Paused Campaign</span>
                    <span className="text-3xl font-black text-foreground mt-1.5 block">
                      {campaigns.filter(c => c.status === 'PAUSED').length}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* History Table Container */}
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-muted/30 border-b border-border/60 px-5 py-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-500" />
                    Past Campaigns History Logs
                  </h2>
                  <button
                    onClick={fetchCampaignHistory}
                    disabled={campaignsLoading}
                    className="p-1.5 border border-border rounded hover:bg-muted text-muted-foreground"
                    title="Refresh Table"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${campaignsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {campaignsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Fetching history logs...</span>
                    </div>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Mail className="w-12 h-12 text-muted-foreground mb-3 opacity-60" />
                    <h3 className="text-base font-bold text-foreground">No Campaigns Recorded</h3>
                    <p className="text-muted-foreground text-xs mt-1 max-w-sm">
                      There are no mass email broadcasts launched from the system yet. Go back to Compose to launch your first.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/30 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Campaign Info</th>
                          <th className="px-5 py-3.5">Created Date</th>
                          <th className="px-5 py-3.5 text-center">Recipients</th>
                          <th className="px-5 py-3.5 text-center">Sent / Fail</th>
                          <th className="px-5 py-3.5 text-center">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {campaigns.map((camp) => (
                          <tr key={camp.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-bold text-foreground truncate max-w-xs">{camp.subject}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">Campaign ID: #{camp.id}</div>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground text-xs">
                              {new Date(camp.createdAt).toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-center font-semibold text-foreground">
                              {camp.totalCount}
                            </td>
                            <td className="px-5 py-4 text-center text-xs">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{camp.sentCount} sent</span>
                                <span className="text-muted-foreground">•</span>
                                <span className={`${camp.actualFailedCount > 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                  {camp.actualFailedCount} failed
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                camp.status === 'COMPLETED' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                  : camp.status === 'SENDING' 
                                    ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20 animate-pulse'
                                    : camp.status === 'PAUSED'
                                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-bounce'
                                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                              }`}>
                                {camp.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Resume sending action */}
                                {(camp.status === 'PAUSED' || camp.status === 'FAILED') && camp.pendingCount > 0 && (
                                  <button
                                    onClick={() => handleCampaignAction(camp.id, 'resume')}
                                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs rounded transition-all"
                                    title="Resume sending pending logs"
                                  >
                                    Resume ({camp.pendingCount})
                                  </button>
                                )}

                                {/* Retry failed sending action */}
                                {camp.actualFailedCount > 0 && (
                                  <button
                                    onClick={() => handleCampaignAction(camp.id, 'retry_failed')}
                                    className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-600 font-bold text-xs rounded transition-all"
                                    title="Retry all failed emails"
                                  >
                                    Retry Failed
                                  </button>
                                )}

                                {/* Resend / reuse campaign */}
                                <button
                                  type="button"
                                  onClick={() => handleResendCampaignInit(camp)}
                                  className="px-2.5 py-1 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400 font-bold text-xs rounded transition-all"
                                  title="Resend this campaign message to new/remaining recipients"
                                >
                                  Resend
                                </button>

                                <button
                                  onClick={() => fetchCampaignLogs(camp.id)}
                                  className="p-1 border border-border/80 rounded hover:bg-muted text-foreground flex items-center gap-1 text-xs px-2.5 py-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="bg-muted/10 border-t border-border px-5 py-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SidebarInset>

      {/* MODAL 1: DETAILED RECIPIENT LOGS MODAL */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp">
            
            {/* Modal Header */}
            <div className="bg-muted/30 border-b border-border/60 px-6 py-4 flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground truncate max-w-xl">
                  Campaign Logs: {selectedCampaign.subject}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                  <span>Created: {new Date(selectedCampaign.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>ID: #{selectedCampaign.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="text-muted-foreground hover:bg-muted p-1.5 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Mini Stats panel */}
            <div className="p-4 border-b border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-zinc-900/10">
              <div className="text-center p-2 bg-card border border-border/40 rounded-lg">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Total Recipients</span>
                <span className="text-xl font-bold text-foreground">{selectedCampaign.totalCount}</span>
              </div>
              <div className="text-center p-2 bg-card border border-border/40 rounded-lg">
                <span className="text-[10px] text-emerald-600 uppercase tracking-wider block font-bold">Successful Delivery</span>
                <span className="text-xl font-bold text-emerald-600">{selectedCampaign.sentCount}</span>
              </div>
              <div className="text-center p-2 bg-card border border-border/40 rounded-lg">
                <span className="text-[10px] text-destructive uppercase tracking-wider block font-bold">Failed Count</span>
                <span className="text-xl font-bold text-destructive">{selectedCampaign.actualFailedCount}</span>
              </div>
              <div className="text-center p-2 bg-card border border-border/40 rounded-lg">
                <span className="text-[10px] text-amber-600 uppercase tracking-wider block font-bold">Remaining Pending</span>
                <span className="text-xl font-bold text-amber-600">{selectedCampaign.pendingCount}</span>
              </div>
            </div>

            {/* Modal Tabs Selector */}
            <div className="px-6 border-b border-border/40 bg-muted/10 flex">
              <button
                type="button"
                onClick={() => setModalTab('recipients')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  modalTab === 'recipients'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Delivery Recipients Logs ({selectedCampaign.totalCount})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('message')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  modalTab === 'message'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Sent Message Content
              </button>
            </div>

            {modalTab === 'message' ? (
              <div className="flex-1 overflow-y-auto min-h-[300px] p-6 bg-slate-100 dark:bg-zinc-950/20">
                <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm p-6 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  
                  {/* Brand Header */}
                  <div className="border-b border-slate-200 dark:border-zinc-800 pb-4 mb-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={logoUrl} 
                      alt="GBUR Logo" 
                      className="h-10 mx-auto object-contain block"
                      onError={(e) => {
                        e.currentTarget.src = "https://res.cloudinary.com/dcu6qjld4/image/upload/v1716382100/logo_vwh9f1.png";
                      }}
                    />
                  </div>

                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
                    {selectedCampaign.subject}
                  </h2>

                  <div 
                    className="email-body-preview min-h-[100px] break-words whitespace-pre-line"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedCampaign.body.replace(/\n/g, '<br/>')
                    }}
                  />

                  <div className="h-0 border-t border-slate-200 dark:border-zinc-800 my-6"></div>

                  <div 
                    className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: gburOfficeInfo }}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Filter Log Toolbar */}
                <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  {/* Status Tab filters inside modal */}
                  <div className="flex bg-muted/40 p-1 rounded-lg border border-border/40 self-stretch sm:self-auto">
                    {(['ALL', 'SENT', 'PENDING', 'FAILED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setLogsFilterStatus(st)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          logsFilterStatus === st 
                            ? 'bg-card text-foreground shadow-xs border border-border/20' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Log Search input */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search logs by name/email..."
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Logs List Table */}
                <div className="flex-1 overflow-y-auto min-h-[300px]">
                  {logsLoading ? (
                    <div className="flex items-center justify-center h-full py-16">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredRecipientLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                      <AlertCircle className="w-10 h-10 mb-2 text-muted-foreground opacity-60" />
                      <p className="text-xs">No matching recipient delivery records found.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/20 border-b border-border sticky top-0 font-bold text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Recipient</th>
                          <th className="px-6 py-3 text-center">Type</th>
                          <th className="px-6 py-3 text-center">Status</th>
                          <th className="px-6 py-3">Details / Errors</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredRecipientLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                            <td className="px-6 py-3">
                              <div className="font-semibold text-foreground">{log.recipientName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{log.recipientEmail}</div>
                            </td>
                            <td className="px-6 py-3 text-center capitalize text-[10px] font-semibold text-muted-foreground">
                              {log.recipientType}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                log.status === 'SENT' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                  : log.status === 'PENDING' 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-muted-foreground max-w-xs truncate font-mono text-[10px]">
                              {log.status === 'SENT' && log.sentAt ? (
                                <span className="flex items-center gap-1">
                                  Sent: {new Date(log.sentAt).toLocaleTimeString()}
                                </span>
                              ) : log.errorMessage ? (
                                <span className="text-destructive font-semibold flex items-center gap-1 text-[10px]">
                                  Error: {log.errorMessage}
                                </span>
                              ) : (
                                <span className="italic">Queued in background</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right">
                              {log.status === 'FAILED' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetrySingle(log.id)}
                                  className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-600 font-bold rounded"
                                  title="Resend email to this failed recipient"
                                >
                                  Retry
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div className="bg-muted/10 border-t border-border/40 p-4 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Campaign Details view panel</span>
              <div className="flex gap-2">
                {selectedCampaign.actualFailedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCampaignAction(selectedCampaign.id, 'retry_failed')}
                    className="px-4 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-500/95 shadow-sm transition-all"
                  >
                    Retry All {selectedCampaign.actualFailedCount} Failed
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCampaign(null)}
                  className="px-4 py-2 border border-border/80 rounded-lg hover:bg-muted text-foreground font-semibold"
                >
                  Close Detailed logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION SEND MODAL */}
      {showConfirmModal && (() => {
        const finalSelectedCount = targetGroup === 'custom' ? customRecipients.length : (matchingCount - excludedEmails.length);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">

              {/* ── SUCCESS STATE ── */}
              {campaignSuccessData ? (
                <div className="flex flex-col items-center p-8 text-center gap-5">
                  {/* Animated checkmark ring */}
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-foreground mb-1">Campaign Launched!</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your email campaign has been successfully queued with{' '}
                      <span className="font-bold text-emerald-500">{campaignSuccessData.totalCount} {campaignSuccessData.totalCount === 1 ? 'recipient' : 'recipients'}</span>.
                      Background delivery has started.
                    </p>
                  </div>

                  <div className="w-full p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2 text-left">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Emails are being sent in the background. Visit <strong>Campaign History</strong> to monitor delivery progress, retry failures, or resume paused sends.
                    </span>
                  </div>

                  <div className="flex gap-3 w-full mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmModal(false);
                        setCampaignSuccessData(null);
                        setCampaignError(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-border/80 rounded-xl hover:bg-muted text-foreground font-semibold text-sm"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmModal(false);
                        setCampaignSuccessData(null);
                        setCampaignError(null);
                        setActiveTab('history');
                      }}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Clock className="w-4 h-4" />
                      View History
                    </button>
                  </div>
                </div>
              ) : (
                /* ── CONFIRM / SENDING STATE ── */
                <div className="p-6">
                  <div className="flex items-center gap-3 text-amber-500 mb-4 border-b border-border/40 pb-3">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                    <h3 className="text-base font-bold text-foreground">Confirm Mass Emailing Campaign</h3>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You are about to launch a mass announcement email broadcast. Verify the campaign metrics below before sending:
                  </p>

                  <div className="my-4 p-4 border border-border/30 rounded-xl bg-muted/20 dark:bg-zinc-900/30 flex flex-col gap-3 text-xs shadow-inner">
                    <div className="flex justify-between items-center border-b border-border/20 pb-2">
                      <span className="text-muted-foreground font-medium">Target Recipient Scope:</span>
                      <span className="font-bold capitalize bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px]">
                        {targetGroup} Profiles
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/20 pb-2">
                      <span className="text-muted-foreground font-medium">Total Email Deliveries:</span>
                      <span className="font-extrabold text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
                        {finalSelectedCount} {finalSelectedCount === 1 ? 'contact' : 'contacts'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/20 pb-2">
                      <span className="text-muted-foreground font-medium">Attachments count:</span>
                      <span className="font-semibold text-foreground bg-muted-foreground/10 px-2 py-0.5 rounded text-[10px]">
                        {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Daily safety protection:</span>
                      <span className="font-semibold text-sky-500 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Guarded (&lt; 450/day)
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                    <Info className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    <strong>SMTP Protection active:</strong> If sending exceeds 450 emails today, the campaign will automatically pause. You can resume the rest safely tomorrow!
                  </p>

                  {/* Inline error banner */}
                  {campaignError && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{campaignError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end mt-5 border-t border-border/40 pt-4">
                    <button
                      type="button"
                      disabled={sendingCampaign}
                      onClick={() => {
                        setShowConfirmModal(false);
                        setCampaignError(null);
                      }}
                      className="px-4 py-2 border border-border/80 rounded-xl hover:bg-muted text-foreground font-semibold text-xs disabled:opacity-50"
                    >
                      Cancel / Edit draft
                    </button>
                    <button
                      type="button"
                      disabled={sendingCampaign || finalSelectedCount === 0}
                      onClick={handleSendCampaign}
                      className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 shadow-sm text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all"
                    >
                      {sendingCampaign ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Launching background worker...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Confirm &amp; Send Campaign
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </SidebarProvider>
  );
}
