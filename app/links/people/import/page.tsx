"use client";

import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Info } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data?: unknown }>;
}

export default function MemberImportPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const processExcelFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ""
          }) as unknown[][];

          if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row');
          }

          const headers = jsonData[0].map((h: unknown) => String(h).toLowerCase().trim());
          const members: Record<string, unknown>[] = [];

          // Process each data row
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.every(cell => !cell)) continue; // Skip empty rows

            const memberData: Record<string, unknown> = {};
            let firstName = "";
            let secondName = "";

            // Map Excel columns to member fields
            headers.forEach((header, index) => {
              const value = row[index] ? String(row[index]).trim() : '';

              switch (header) {
                case 'firstname':
                case 'first name':
                  firstName = value;
                  break;
                case 'secondname':
                case 'second name':
                case 'lastname':
                case 'last name':
                  secondName = value;
                  break;
                case 'fullname':
                case 'full name':
                  memberData.fullName = value;
                  break;
                case 'gender':
                  memberData.gender = value;
                  break;
                case 'birthdate':
                case 'date of birth':
                  memberData.birthdate = value;
                  break;
                case 'email':
                  memberData.email = value;
                  break;
                case 'phone':
                case 'phone number':
                  memberData.phone = value;
                  break;
                case 'type':
                case 'category':
                  memberData.type = value.toLowerCase();
                  break;
                case 'university':
                case 'campus':
                  memberData.university = value; // logic in API will try to resolve this
                  break;
                case 'year of study':
                case 'year':
                  memberData.yearOfStudy = value;
                  break;
                case 'course':
                case 'faculty':
                  memberData.course = value;
                  break;
                case 'student status':
                case 'status':
                  memberData.status = value.toLowerCase();
                  break;
                // Graduate fields
                case 'graduation year':
                  memberData.graduationYear = value;
                  break;
                case 'province':
                case 'residence province':
                  memberData.residenceProvince = value;
                  break;
              }
            });

            // Construct fullName if not provided
            if (!memberData.fullName && (firstName || secondName)) {
              memberData.fullName = `${firstName} ${secondName}`.trim();
            }

            // Default to student if not specified? Or error?
            // API expects 'type'.
            if (!memberData.type) {
              // heuristic?
              if (memberData.graduationYear) memberData.type = 'graduate';
              else memberData.type = 'student';
            }

            members.push(memberData);
          }

          if (members.length === 0) {
            throw new Error('No valid data rows found in Excel file');
          }

          setIsProcessing(true);

          // Send to API
          const response = await axios.post('/api/import', { members: members });

          setImportResult(response.data);

          // Show success message if import was successful
          if (response.data.success > 0) {
            setShowSuccessMessage(true);
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
              setShowSuccessMessage(false);
            }, 5000);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const processCSVFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');

          if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
          }

          // Parse CSV manually for better control
          const headers = lines[0].split(',').map((h: unknown) => String(h).toLowerCase().trim().replace(/"/g, ''));
          const members: Record<string, unknown>[] = [];

          // Process each data row
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            // Simple CSV parsing - split by comma and handle quoted values
            const row = line.split(',').map((cell: string) => cell.trim().replace(/^"|"$/g, ''));

            if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows

            const memberData: Record<string, unknown> = {};

            // Map CSV columns to member fields
            headers.forEach((header, index) => {
              const value = row[index] ? String(row[index]).trim() : '';

              switch (header) {
                case 'firstname':
                  memberData.firstname = value;
                  break;
                case 'secondname':
                  memberData.secondname = value;
                  break;
                case 'gender':
                  memberData.gender = value;
                  break;
                case 'birthdate':
                  memberData.birthdate = value;
                  break;
                case 'placeofbirthdistrict':
                  memberData.placeOfBirthDistrict = value;
                  break;
                case 'placeofbirthsector':
                  memberData.placeOfBirthSector = value;
                  break;
                case 'localchurch':
                  memberData.localChurch = value;
                  break;
                case 'email':
                  memberData.email = value;
                  break;
                case 'phone':
                  memberData.phone = value;
                  break;
                case 'type':
                  memberData.type = value;
                  break;
                case 'status':
                  memberData.status = value;
                  break;
                case 'regionid':
                  memberData.regionId = value ? Number(value) : null;
                  break;
                case 'universityid':
                  memberData.universityId = value ? Number(value) : null;
                  break;
                case 'smallgroupid':
                  memberData.smallGroupId = value ? Number(value) : null;
                  break;
                case 'alumnigroupid':
                  memberData.alumniGroupId = value ? Number(value) : null;
                  break;
                case 'graduationdate':
                  memberData.graduationDate = value;
                  break;
                case 'faculty':
                  memberData.faculty = value;
                  break;
                case 'professionalism':
                  memberData.professionalism = value;
                  break;
                case 'maritalstatus':
                  memberData.maritalStatus = value;
                  break;
              }
            });

            members.push(memberData);
          }

          if (members.length === 0) {
            throw new Error('No valid data rows found in CSV file');
          }

          // Send all members to the bulk import API using axios
          const response = await axios.post('/api/import', { members });
          setImportResult(response.data);

          // Show success message if import was successful
          if (response.data.success > 0) {
            setShowSuccessMessage(true);
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
              setShowSuccessMessage(false);
            }, 5000);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const downloadTemplate = () => {
    const headers = [
      'firstname',
      'secondname',
      'gender',
      'birthdate',
      'placeOfBirthDistrict',
      'placeOfBirthSector',
      'localChurch',
      'email',
      'phone',
      'type',
      'status',
      'regionId',
      'universityId',
      'smallGroupId',
      'alumniGroupId',
      'graduationDate',
      'faculty',
      'professionalism',
      'maritalStatus'
    ];

    const sampleData = [
      'John',
      'Doe',
      'male',
      '1990-01-15',
      'Kigali',
      'Nyarugenge',
      'Local Church Name',
      'john.doe@email.com',
      '+250123456789',
      'student',
      'active',
      '1',
      '1',
      '',
      '',
      '2024-06-15',
      'Computer Science',
      'Software Engineer',
      'single'
    ];

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("Selected file:", file.name);
    setFileName(file.name);
    setIsProcessing(true);
    setImportResult(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        await processCSVFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        await processExcelFile(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files (.csv, .xlsx, .xls).');
      }
    } catch (error) {
      console.error('Import error:', error);

      let errorMessage = 'Unknown error occurred during import';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = error.response.data?.error || 'Invalid data format in file';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error occurred during import';
        } else {
          errorMessage = error.response?.data?.error || error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setImportResult({
        success: 0,
        errors: [{ row: 0, error: errorMessage }]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <h1 className="text-lg font-semibold">Member Import</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/links/people">People</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Import Members</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Success Message */}
                {showSuccessMessage && (
                  <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                      <span className="text-green-300 font-medium">
                        Import completed successfully! {importResult?.success} members have been imported.
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSuccessMessage(false)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* File Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="file-upload" className="text-sm font-medium">
                      Upload File
                    </Label>
                    <Button
                      onClick={downloadTemplate}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                  </div>

                  <div className="relative">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>

                  {fileName && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="w-4 h-4 mr-2 text-primary" />
                      Selected: {fileName}
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Processing file...</span>
                    </div>
                  )}
                </div>

                {/* Import Results */}
                {importResult && (
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Import Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {importResult.success > 0 && (
                        <div className="text-green-600 text-sm flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Successfully imported: {importResult.success} members
                        </div>
                      )}

                      {importResult.errors.length > 0 && (
                        <div>
                          <div className="text-destructive font-medium text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Errors: {importResult.errors.length}
                          </div>
                          <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                            {importResult.errors.slice(0, 10).map((error, index) => (
                              <div key={index} className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                                {error.row > 0 ? `Row ${error.row}: ` : ''}{error.error}
                              </div>
                            ))}
                            {importResult.errors.length > 10 && (
                              <div className="text-xs text-muted-foreground italic">
                                ... and {importResult.errors.length - 10} more errors
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* File Format Requirements */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <Info className="w-4 h-4 mr-2 text-primary" />
                      File Format Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Supported formats:</h4>
                        <p className="text-sm text-muted-foreground">CSV, Excel (.xlsx, .xls)</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Required columns:</h4>
                        <p className="text-sm text-muted-foreground">firstname, secondname, gender, type</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Optional columns:</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• birthdate, placeOfBirthDistrict, placeOfBirthSector</p>
                        <p>• localChurch, email, phone, status, regionId, universityId, smallGroupId, alumniGroupId</p>
                        <p>• graduationDate, faculty, professionalism, maritalStatus</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Field values:</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• gender: &quot;male&quot; or &quot;female&quot;</p>
                        <p>• type: &quot;student&quot; or &quot;alumni&quot;</p>
                        <p>• status: &quot;active&quot; or &quot;inactive&quot;</p>
                        <p>• maritalStatus: &quot;single&quot; or &quot;married&quot;</p>
                        <p>• dates: YYYY-MM-DD format (e.g., 1990-01-15)</p>
                      </div>
                    </div>

                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-primary font-medium text-sm">Note: Column names are case-insensitive</p>
                      <p className="text-primary/80 text-xs mt-1">Use the &quot;Download Template&quot; button above to get a sample CSV file with the correct format</p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
