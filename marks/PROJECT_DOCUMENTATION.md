# GBUR Ministry Management System

## 📋 Project Overview

The **GBUR Ministry Management System** is a comprehensive web application designed to manage and streamline operations for the Great Britain University Rwanda (GBUR) ministry. This system provides a centralized platform for managing members, events, finances, and organizational structure across different regions and universities.

## 🎯 Purpose & Mission

This system serves to:
- **Centralize Ministry Operations**: Provide a single platform for all GBUR ministry activities
- **Streamline Member Management**: Track and manage members across different regions, universities, and small groups
- **Facilitate Event Management**: Organize and track attendance for trainings, events, and ministry activities
- **Enable Financial Management**: Handle contributions, designations, and financial reporting
- **Support Organizational Structure**: Manage hierarchical organization from regions down to small groups
- **Provide Analytics & Reporting**: Generate insights on engagement, membership, and financial data

## 🏗️ Technical Architecture

### Technology Stack
- **Frontend**: Next.js 15.5.2 with React 19.1.0
- **Backend**: Next.js API Routes
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Beta)
- **UI Framework**: Tailwind CSS with Radix UI components
- **Deployment**: AWS EC2 with PM2 process management
- **Build Tool**: Turbopack for fast development and builds

### Key Dependencies
```json
{
  "next": "15.5.2",
  "react": "19.1.0",
  "@prisma/client": "^6.16.0",
  "next-auth": "^5.0.0-beta.25",
  "tailwindcss": "^4.1.13",
  "recharts": "^3.2.0",
  "zod": "^4.1.8"
}
```

## 🗂️ Project Structure

```
m-system/
├── app/                          # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── members/            # Member management
│   │   ├── events/             # Event management
│   │   ├── attendance/         # Attendance tracking
│   │   ├── contributions/      # Financial contributions
│   │   ├── regions/            # Regional management
│   │   ├── universities/       # University management
│   │   └── small-groups/       # Small group management
│   ├── dashboard/              # Main dashboard
│   ├── links/                  # Feature pages
│   │   ├── people/            # People management
│   │   ├── organization/      # Organizational structure
│   │   ├── activities/        # Activities and events
│   │   ├── financial/         # Financial management
│   │   ├── reports/           # Reports and analytics
│   │   └── admin/             # System administration
│   └── layout.tsx             # Root layout
├── components/                  # React components
│   ├── ui/                    # Reusable UI components
│   ├── attendance/            # Attendance-specific components
│   ├── reports/               # Report components
│   └── providers/             # Context providers
├── lib/                       # Utility libraries
│   ├── auth.ts               # Authentication configuration
│   ├── prisma.ts             # Database connection
│   ├── rls.ts                # Row Level Security
│   └── utils.ts              # Utility functions
├── prisma/                    # Database schema and migrations
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript type definitions
└── scripts/                   # Utility scripts
```

## 🔐 Authentication & Authorization

### Authentication System
- **Provider**: NextAuth.js with credentials provider
- **Password Security**: bcryptjs for password hashing
- **Session Management**: JWT-based sessions
- **User Roles**: Hierarchical role-based access control

### Role Hierarchy
1. **Super Admin**: Full system access
2. **National**: National-level management
3. **Region**: Regional management
4. **University**: University-level management
5. **Small Group**: Small group management
6. **Alumni Small Group**: Alumni group management

### Row Level Security (RLS)
- Database-level security implementation
- Users can only access data within their scope
- Automatic filtering based on user roles and organizational hierarchy

## 📊 Core Features

### 1. People Management
- **Member Directory**: Comprehensive member database
- **Member Import**: Bulk import functionality for administrators
- **Member Profiles**: Detailed member information including:
  - Personal details (name, contact, birth information)
  - Academic information (university, faculty, graduation date)
  - Ministry involvement (small group, alumni group)
  - Status tracking (active, graduate, alumni, inactive)

### 2. Organization Management
- **Regions**: Geographic organizational units
- **Universities**: Educational institutions within regions
- **Small Groups**: Active student groups within universities
- **Alumni Small Groups**: Post-graduation ministry groups

### 3. Activities & Events
- **Event Management**: Create and manage ministry events
- **Training Programs**: Organize and track training sessions
- **Attendance Tracking**: Record and monitor member attendance
- **Permanent Ministry Events**: Recurring activities (Bible study, discipleship, etc.)

### 4. Financial Management
- **Contributions**: Track financial contributions from members
- **Payment Processing**: Multiple payment methods (mobile money, bank transfer, cards)
- **Designations**: Categorize contributions for specific purposes
- **Financial Reports**: Generate comprehensive financial analytics

### 5. Reports & Analytics
- **Engagement Reports**: Member participation and activity metrics
- **Membership Reports**: Demographic and growth analytics
- **Financial Reports**: Contribution tracking and financial health
- **Power BI Integration**: Advanced analytics and visualization

### 6. System Administration
- **User Management**: Create and manage system users
- **Role Assignment**: Assign appropriate roles to users
- **Audit Logging**: Track system activities and changes
- **Approval Workflows**: Request and approval system for various actions

## 🗄️ Database Schema

### Key Entities

#### Core Entities
- **User**: System users with authentication
- **Member**: Ministry members with detailed profiles
- **Region**: Geographic organizational units
- **University**: Educational institutions
- **Small Group**: Active student groups
- **Alumni Small Group**: Post-graduation groups

#### Activity Entities
- **Trainings**: Training programs and sessions
- **Permanent Ministry Event**: Recurring ministry activities
- **Attendance**: Member attendance records
- **Approval Request**: Workflow management

#### Financial Entities
- **Contribution**: Financial contributions
- **Contribution Designation**: Purpose categorization
- **Payment Transaction**: Payment processing records
- **Budget**: Budget allocation and tracking

#### Supporting Entities
- **Document**: File and document management
- **Notification**: Communication system
- **Audit Log**: System activity tracking
- **Movement**: Member transfer tracking

## 🚀 Deployment & Infrastructure

### Deployment Strategy
- **Local Build**: Build application on development machine
- **Server Deploy**: Upload pre-built application to EC2 server
- **Process Management**: PM2 for application lifecycle management

### Infrastructure
- **Server**: AWS EC2 (98.90.202.108)
- **Database**: MySQL RDS
- **Domain**: Accessible at http://98.90.202.108:3000
- **SSL**: Configured for secure connections

### Deployment Scripts
- `deploy-smart.ps1`: Intelligent deployment (recommended)
- `deploy.ps1`: Full deployment for major changes
- `deploy-update.ps1`: Quick updates for minor changes

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- MySQL database
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd m-system

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure database and authentication settings

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables
```env
DATABASE_URL="mysql://username:password@host:port/database"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 📱 User Interface

### Design System
- **Framework**: Tailwind CSS with custom design tokens
- **Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React icon library
- **Responsive**: Mobile-first responsive design

### Key UI Features
- **Sidebar Navigation**: Role-based navigation menu
- **Dashboard**: Centralized overview with key metrics
- **Data Tables**: Sortable, filterable data presentation
- **Modals**: Form dialogs for data entry
- **Charts**: Data visualization with Recharts
- **Alerts**: User feedback and notifications

## 🔒 Security Features

### Data Protection
- **Row Level Security**: Database-level access control
- **Password Hashing**: bcryptjs for secure password storage
- **Session Management**: Secure JWT-based sessions
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Prisma ORM protection

### Access Control
- **Role-Based Access**: Hierarchical permission system
- **Scope Limitation**: Users limited to their organizational scope
- **Audit Logging**: Complete activity tracking
- **Secure Authentication**: NextAuth.js security best practices

## 📈 Performance & Optimization

### Build Optimization
- **Turbopack**: Fast development and build times
- **Standalone Builds**: Optimized production builds
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js built-in image optimization

### Runtime Performance
- **Server-Side Rendering**: Improved initial load times
- **Static Generation**: Pre-built pages where possible
- **Database Optimization**: Efficient queries with Prisma
- **Caching**: Strategic caching for improved performance

## 🧪 Testing & Quality Assurance

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting consistency
- **Type Checking**: Compile-time error detection

### Testing Strategy
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user workflow testing
- **Database Tests**: RLS and data integrity testing

## 📚 Documentation & Resources

### Available Documentation
- `DEPLOYMENT_MASTER_GUIDE.md`: Complete deployment instructions
- `PRODUCTION_BUILD_PROCEDURE.md`: Build process documentation
- `docs/DASHBOARD_SCOPE_DISPLAY.md`: Dashboard scope documentation
- `docs/RLS_TESTING_GUIDE.md`: Row Level Security testing guide

### API Documentation
- RESTful API endpoints for all major features
- Comprehensive error handling and status codes
- Request/response schemas with TypeScript types

## 🔄 Maintenance & Updates

### Regular Maintenance
- **Database Backups**: Automated backup procedures
- **Security Updates**: Regular dependency updates
- **Performance Monitoring**: Application performance tracking
- **User Feedback**: Continuous improvement based on user input

### Update Procedures
- **Development**: Local development with hot reloading
- **Staging**: Test environment for validation
- **Production**: Automated deployment with rollback capability
- **Monitoring**: Post-deployment monitoring and alerting

## 🤝 Contributing

### Development Workflow
1. **Feature Branch**: Create feature-specific branches
2. **Code Review**: Peer review process for all changes
3. **Testing**: Comprehensive testing before merge
4. **Documentation**: Update documentation with changes
5. **Deployment**: Automated deployment pipeline

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Enforced code style guidelines
- **Component Structure**: Consistent component organization
- **API Design**: RESTful API conventions

## 📞 Support & Contact

### Technical Support
- **Documentation**: Comprehensive guides and references
- **Issue Tracking**: GitHub issues for bug reports
- **Feature Requests**: GitHub discussions for new features
- **Community**: Developer community for collaboration

### System Administration
- **User Management**: Admin panel for user administration
- **Role Assignment**: Flexible role and permission management
- **Audit Logs**: Complete system activity tracking
- **Backup & Recovery**: Data protection and recovery procedures

---

## 🎉 Conclusion

The GBUR Ministry Management System represents a comprehensive solution for managing ministry operations across multiple organizational levels. With its robust architecture, secure design, and user-friendly interface, it provides the tools necessary for effective ministry management and growth tracking.

The system's modular design allows for easy expansion and customization to meet evolving ministry needs, while its security features ensure data protection and appropriate access control across all organizational levels.

For technical support, deployment assistance, or feature requests, please refer to the appropriate documentation or contact the development team.
