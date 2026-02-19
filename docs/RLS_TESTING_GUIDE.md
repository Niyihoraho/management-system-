# RLS Testing Guide

## Overview
This guide explains how to test the Row-Level Security (RLS) implementation with the updated SmallGroupTable component.

## Test Scenarios

### 1. Small Group User Access
Based on the terminal logs, we can see a user with:
- **Scope**: `smallgroup`
- **Region ID**: 1 (North-West)
- **University ID**: 2 (IPrc Musanze)
- **Small Group ID**: 1 (Grace)

This user should only see members from their specific small group.

### 2. Expected Behavior

#### SmallGroupTable Component
When a small group user accesses the members page, they should see:

1. **Small Group Information Header**:
   - Small Group Name: "Grace"
   - University: "IPrc Musanze"
   - Region: "North-West"
   - Total Members: Count of members in their small group

2. **Filtered Member List**:
   - Only members with `smallGroupId: 1`
   - Only members with `universityId: 2`
   - Only members with `regionId: 1`

3. **Member Details**:
   - Member type (student, graduate, etc.)
   - Member status (active, inactive, etc.)
   - Faculty information (if available)

### 3. API Endpoints to Test

#### GET /api/members
**Expected Response**: Only members from the user's small group
```json
{
  "members": [
    {
      "id": 1,
      "firstname": "John",
      "secondname": "Doe",
      "smallGroupId": 1,
      "universityId": 2,
      "regionId": 1,
      "smallgroup": { "name": "Grace" },
      "university": { "name": "IPrc Musanze" },
      "region": { "name": "North-West" }
    }
  ]
}
```

#### GET /api/members?smallGroupId=2
**Expected Response**: 403 Forbidden (user can't access other small groups)

#### GET /api/members?universityId=3
**Expected Response**: 403 Forbidden (user can't access other universities)

### 4. Frontend Testing

#### SmallGroupTable Component Features
1. **Loading State**: Shows skeleton while fetching data
2. **Small Group Header**: Displays group information prominently
3. **Member Table**: Shows filtered members with additional details
4. **Responsive Design**: Works on mobile and desktop
5. **Search Functionality**: Search within accessible members only

#### Visual Elements
- **Church Icon**: Represents the small group
- **Building Icon**: Shows university information
- **Map Pin Icon**: Shows region information
- **Users Icon**: Shows member count
- **Graduation Cap Icon**: Shows member type
- **Status Badges**: Color-coded member status

### 5. Security Validation

#### Positive Tests
- ✅ User can see their small group information
- ✅ User can see only their small group members
- ✅ User can search within their accessible data
- ✅ User can view member details

#### Negative Tests
- ❌ User cannot access other small groups
- ❌ User cannot access other universities
- ❌ User cannot access other regions
- ❌ API returns 403 for unauthorized requests

### 6. Test Commands

#### Test API Endpoints
```bash
# Test with small group user token
curl -H "Authorization: Bearer <smallgroup_user_token>" /api/members

# Test unauthorized access
curl -H "Authorization: Bearer <smallgroup_user_token>" /api/members?smallGroupId=2

# Test user scope
curl -H "Authorization: Bearer <smallgroup_user_token>" /api/members/current-user-scope
```

#### Expected API Responses
```bash
# GET /api/members/current-user-scope
{
  "scope": {
    "scope": "smallgroup",
    "regionId": 1,
    "universityId": 2,
    "smallGroupId": 1,
    "alumniGroupId": null,
    "region": { "id": 1, "name": "North-West" },
    "university": { "id": 2, "name": "IPrc Musanze" },
    "smallGroup": { "id": 1, "name": "Grace" },
    "alumniGroup": null
  }
}
```

### 7. Browser Testing

#### Steps to Test
1. **Login** as a small group user
2. **Navigate** to `/links/people/members`
3. **Verify** small group header shows correct information
4. **Check** that only relevant members are displayed
5. **Test** search functionality
6. **Verify** responsive design on mobile

#### Expected UI Elements
- Small group name prominently displayed
- University and region information
- Member count
- Filtered member list
- Member type and status badges
- Search functionality
- Pagination (if needed)

### 8. Performance Considerations

#### RLS Impact
- **Query Performance**: RLS conditions are applied at database level
- **Caching**: User scope is cached per session
- **Network**: Only relevant data is fetched
- **UI**: Loading states provide good UX

#### Optimization
- User scope is fetched once per session
- RLS conditions are generated efficiently
- Database queries are optimized with proper indexes
- Frontend components handle loading states gracefully

### 9. Troubleshooting

#### Common Issues
1. **Empty Member List**: Check user scope and RLS conditions
2. **Access Denied**: Verify user has correct role assignment
3. **Loading Issues**: Check API endpoint and authentication
4. **UI Problems**: Verify component props and state management

#### Debug Steps
1. Check browser console for errors
2. Verify API responses in Network tab
3. Check user scope in `/api/members/current-user-scope`
4. Verify RLS conditions in server logs
5. Test with different user roles

### 10. Success Criteria

The RLS implementation is working correctly when:
- ✅ Users only see data within their scope
- ✅ Small group information is displayed correctly
- ✅ Member details are shown with proper formatting
- ✅ Search and pagination work within accessible data
- ✅ UI is responsive and user-friendly
- ✅ Security is enforced at both API and UI levels
- ✅ Performance is acceptable with RLS overhead

This testing guide ensures that the RLS system provides secure, efficient, and user-friendly access to small group member data.

