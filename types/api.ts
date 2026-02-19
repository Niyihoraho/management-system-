// API Request and Response Types

// User Types
export interface UserPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Event Types
export interface EventPayload {
  name: string;
  type: string;
  regionId?: number;
  universityId?: number;
  smallGroupId?: number;
  alumniGroupId?: number;
  isActive?: boolean;
}

export interface EventResponse {
  id: string;
  title: string;
  description?: string;
  date: Date;
  location?: string;
  universityId?: string;
  smallGroupId?: string;
  alumniGroupId?: string;
  capacity?: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Member Types
export interface MemberPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  universityId?: string;
  smallGroupId?: string;
  regionId?: string;
  membershipStatus?: string;
  placeOfBirthProvince?: string;
}

export interface MemberResponse {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  universityId?: string;
  smallGroupId?: string;
  regionId?: string;
  membershipStatus: string;
  placeOfBirthProvince?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Contribution Types
export interface ContributionPayload {
  amount: number;
  contributorId: string;
  paymentProviderId?: string;
  description?: string;
  contributionDate?: string | Date;
  paymentMethod?: string;
}

export interface ContributionResponse {
  id: string;
  amount: number;
  contributorId: string;
  paymentProviderId?: string;
  description?: string;
  contributionDate: Date;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Role Types
export interface UserRolePayload {
  userId: string;
  role: string;
  universityId?: string;
  smallGroupId?: string;
  regionId?: string;
}

export interface UserRoleResponse {
  id: string;
  userId: string;
  role: string;
  universityId?: string;
  smallGroupId?: string;
  regionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface AnalyticsData {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  membershipGrowth: Array<{
    month: string;
    count: number;
  }>;
  membersByRegion: Array<{
    region: string;
    count: number;
  }>;
  membersByGender: Array<{
    gender: string;
    count: number;
  }>;
}

export interface EngagementAnalytics {
  totalEvents: number;
  totalAttendance: number;
  averageAttendance: number;
  eventsByMonth: Array<{
    month: string;
    count: number;
  }>;
  attendanceByRegion: Array<{
    region: string;
    attendance: number;
  }>;
}

// Import/Export Types
export interface ImportMemberData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  university?: string;
  smallGroup?: string;
  region?: string;
  membershipStatus?: string;
  placeOfBirthProvince?: string;
}

export interface ExportData {
  [key: string]: string | number | Date | boolean | null | undefined;
}

// Generic API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
