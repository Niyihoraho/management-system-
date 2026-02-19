Refactor Blueprint: m-system Dual-Model Architecture
1. System Cleanup & Module Removal
Delete Modules
The following models and their associated logic (API routes, UI components, types) must be deleted:

Activities: Trainings, PermanentMinistryEvent
Attendance: Attendance
Financial Management: Budget
Contributions: Contributor, Contribution, ContributionReceipt
Designations: ContributionDesignation
Payment Processing: PaymentGateway, PaymentTransaction
Nomenclature Update
Refactor: Globally replace instances of "Alumni" with "Graduate".
Schema: AlumniSmallGroup -> GraduateSmallGroup.
UI/API: Rename routes alumni-small-groups -> graduate-small-groups.
Enums: MemberType.alumni -> MemberType.graduate. RoleScope.alumnismallgroup -> RoleScope.graduatesmallgroup.
2. Dual-Model Member Refactor
We are splitting the 
Member
 model into two distinct models: Student and Graduate.

Student Model
Scope: Undergraduate University/SmallGroup tracking.
Attributes:
firstname, lastname (or fullname split)
phone
email
universityId (FK)
smallGroupId (FK)
course
yearOfStudy
Geography:
placeOfBirthProvince, placeOfBirthDistrict, placeOfBirthSector, placeOfBirthCell, placeOfBirthVillage (Rwanda Location).
Constraints:
No pillars, financialSupport, or diaspora fields.
Graduate Model
Scope: Post-university engagement.
Attributes:
firstname, lastname
phone
email
university (String - Name of University Attended)
regionId (FK for RLS/Residence)
graduateGroupId (FK to GraduateSmallGroup)
course
graduationYear
Geography:
residenceProvince, residenceDistrict, residenceSector (Restricted to Sector level).
Diaspora Logic:
isDiaspora (Boolean). If true, bypass residence fields.
Engagement:
servingPillars: Enum/Array (Mobilization, CapacityBuilding, EventPlanning, GraduateCellManagement, SocialCohesion, PrayerPromotion, DatabaseManagement).
Financials:
supportStatus: Enum (I support, I need support).
supportFrequency: Enum (Monthly, Quarterly, Annually).
3. Organizational & Security Alignment (RLS)
RLS Logic: Both models (Student, Graduate) retain regionId. Student retains universityId.
Updates:
Update 
generateRLSConditions
 to handle Student and Graduate specific scopes.
Ensure Graduate access is governed by regionId (Residence/Ministry Location).
4. Prisma Schema Snippet
prisma
// Enums
enum GraduatePillar {
  mobilization
  capacity_building
  event_planning
  graduate_cell_management
  social_cohesion
  prayer_promotion
  database_management
}
enum SupportStatus {
  supporter
  beneficiary
}
enum SupportFrequency {
  monthly
  quarterly
  annually
}
// Renamed and Refactored Group
model GraduateSmallGroup {
  id       Int    @id @default(autoincrement())
  name     String
  regionId Int    @map("regionId")
  region   Region @relation(fields: [regionId], references: [id], onDelete: Restrict)
  graduates Graduate[]
  @@index([regionId])
  @@map("graduatesmallgroup")
}
model Student {
  id        Int      @id @default(autoincrement())
  firstname String
  lastname  String
  phone     String?
  email     String?  @unique
  
  // Education
  course      String?
  yearOfStudy Int?
  // Location (Place of Birth)
  placeOfBirthProvince String?
  placeOfBirthDistrict String?
  placeOfBirthSector   String?
  placeOfBirthCell     String?
  placeOfBirthVillage  String?
  // RLS & Org
  universityId Int    @map("universityId")
  regionId     Int?   @map("regionId") // Optional if driven by Uni
  smallGroupId Int?   @map("smallGroupId")
  university University  @relation(fields: [universityId], references: [id], onDelete: Restrict)
  region     Region?     @relation(fields: [regionId], references: [id], onDelete: SetNull)
  smallGroup SmallGroup? @relation(fields: [smallGroupId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([universityId])
  @@index([smallGroupId])
  @@map("student")
}
model Graduate {
  id        Int      @id @default(autoincrement())
  firstname String
  lastname  String
  phone     String?
  email     String?  @unique
  // Education (History)
  university     String? // Free text, not a relation
  course         String?
  graduationYear Int?
  // Diaspora & Location
  isDiaspora        Boolean @default(false)
  residenceProvince String?
  residenceDistrict String?
  residenceSector   String?
  // Ministry & RLS
  regionId        Int? @map("regionId") // Current Region
  graduateGroupId Int? @map("graduateGroupId")
  // Engagement
  servingPillars GraduatePillar[]
  
  // Financials
  supportStatus    SupportStatus?
  supportFrequency SupportFrequency?
  region        Region?             @relation(fields: [regionId], references: [id], onDelete: SetNull)
  graduateGroup GraduateSmallGroup? @relation(fields: [graduateGroupId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([regionId])
  @@index([graduateGroupId])
  @@map("graduate")
}
5. Implementation Strategy
Step 1: Database Migration
Empty DB: Since the database is empty, no data migration is needed.
Schema Update: Apply the provided Prisma schema changes.
Migration: Run npx prisma db push or npx prisma migrate reset to potentially clear and apply new schema from scratch.
Step 2: API Route Refactor
Delete: Remove app/api/members, app/api/attendance, etc.
Create:
app/api/students/route.ts: Clone logic from members, strip non-student fields. Enforce universityId.
app/api/graduates/route.ts: Clone logic, add isDiaspora handling, support fields. Enforce regionId or graduateGroupId.
Update RLS:
Modify lib/rls.ts to export getTableRLSConditions dealing with student and graduate tables.
Update RoleScope enum to include graduatesmallgroup.
Step 3: Frontend & Sidebar Updates
Sidebar (app/components/app-sidebar.tsx):
Retrieve userRole (e.g., university admin sees "Students", region admin sees "Graduates").
Navigation:
"People Management" -> "Students" (/links/people/students), "Graduates" (/links/people/graduates).
"Organization" -> Replace "Alumni Small Groups" with "Graduate Small Groups".
Forms:
Create StudentForm (University specific, Location: Place of Birth).
Create GraduateForm (Region specific, Location: Residence (Sector limit), Diaspora toggle, Pillars, Financials).
Step 4: Component Cleanup
Delete app/components/events, app/components/finance, etc.
Search and replace Alumni -> Graduate in all UI strings.