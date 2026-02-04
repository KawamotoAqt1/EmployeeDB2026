# Company Module Complete Audit Report

## 1. Overview

This document provides a comprehensive audit of the Company module implementation across all layers: Database (Prisma), Backend API, and Frontend.

---

## 2. Field Mapping Across Layers

### 2.1 Company (企業) Entity

| DB Column (schema.prisma) | DB Type | API Field | Frontend Type (index.ts) | Form Field (CompanyForm) | Notes |
|---------------------------|---------|-----------|--------------------------|--------------------------|-------|
| id | UUID | id | id: string | - (auto) | Primary key |
| code | VARCHAR(50) | code | code: string | code | Required, Unique |
| name | VARCHAR(200) | name | name: string | name | Required |
| nameKana | VARCHAR(200) | nameKana | nameKana?: string | nameKana | Optional |
| postalCode | VARCHAR(10) | postalCode | **MISSING** | **MISSING** | **INCONSISTENCY** |
| address | TEXT | address | **MISSING** | **MISSING** | **INCONSISTENCY** |
| phone | VARCHAR(20) | phone | **MISSING** | **MISSING** | **INCONSISTENCY** |
| website | VARCHAR(500) | website | website?: string | website | Optional |
| industry | VARCHAR(100) | industry | industry?: string | industry | Optional |
| status | ENUM | status | status: CompanyStatus | status | Default: ACTIVE |
| remark | TEXT | remark | remark?: string | remark | Optional |
| createdAt | DateTime | createdAt | createdAt: string | - (auto) | Auto-generated |
| updatedAt | DateTime | updatedAt | updatedAt: string | - (auto) | Auto-updated |

**Issues Found:**
1. **postalCode, address, phone fields exist in DB schema but are MISSING from frontend type definition (Company interface)**
2. **CompanyForm does not include postalCode, address, phone input fields for the company itself (only for offices)**

### 2.2 CompanyOffice (企業拠点) Entity

| DB Column (schema.prisma) | DB Type | API Field | Frontend Type (index.ts) | Form Field | Notes |
|---------------------------|---------|-----------|--------------------------|------------|-------|
| id | UUID | id | id: string | - (auto) | Primary key |
| companyId | UUID | companyId | companyId: string | - (auto) | Foreign key |
| name | VARCHAR(200) | name | name: string | name | Required |
| postalCode | VARCHAR(10) | postalCode | postalCode?: string | postalCode | Optional |
| address | TEXT | address | address?: string | address | Optional |
| phone | VARCHAR(20) | phone | phone?: string | phone | Optional |
| isHeadquarters | Boolean | isHeadquarters | isHeadquarters: boolean | isHeadquarters | Default: false |
| sortOrder | Int | sortOrder | sortOrder: number | - (auto) | Default: 0 |
| createdAt | DateTime | createdAt | createdAt: string | - (auto) | Auto-generated |
| updatedAt | DateTime | updatedAt | **MISSING** | - | **DB has it, frontend lacks it** |

**Issues Found:**
1. **Frontend CompanyOffice type is missing updatedAt field**

### 2.3 CompanyDepartment (企業部署) Entity

| DB Column (schema.prisma) | DB Type | API Field | Frontend Type (index.ts) | Form Field | Notes |
|---------------------------|---------|-----------|--------------------------|------------|-------|
| id | UUID | id | id: string | - | Primary key |
| companyId | UUID | companyId | companyId: string | - | Foreign key |
| officeId | UUID (nullable) | officeId | **MISSING** | **MISSING** | **INCONSISTENCY** |
| parentId | UUID (nullable) | parentId | parentId?: string | parentId | Self-reference |
| type | ENUM | type | **MISSING** | **MISSING** | **INCONSISTENCY** |
| name | VARCHAR(200) | name | name: string | name | Required |
| sortOrder | Int | sortOrder | sortOrder: number | - | Default: 0 |
| createdAt | DateTime | createdAt | createdAt: string | - | Auto-generated |
| updatedAt | DateTime | updatedAt | **MISSING** | - | **DB has it, frontend lacks it** |

**Issues Found:**
1. **Frontend CompanyDepartment type is missing officeId field**
2. **Frontend CompanyDepartment type is missing type (DepartmentType) field**
3. **Frontend CompanyDepartment type is missing updatedAt field**
4. **DepartmentType enum (DIVISION, DEPARTMENT, SECTION, UNIT, OTHER) is not defined in frontend types**
5. **CompanyForm does not have UI for managing departments (only offices and contacts)**

### 2.4 CompanyContact (企業担当窓口) Entity

| DB Column (schema.prisma) | DB Type | API Field | Frontend Type (index.ts) | Form Field | Notes |
|---------------------------|---------|-----------|--------------------------|------------|-------|
| id | UUID | id | id: string | - | Primary key |
| companyId | UUID | companyId | companyId: string | - | Foreign key |
| departmentId | UUID (nullable) | departmentId | departmentId?: string | **MISSING** | **Not in form** |
| name | VARCHAR(100) | name | name: string | name | Required |
| nameKana | VARCHAR(100) | nameKana | nameKana?: string | nameKana | Optional |
| title | VARCHAR(100) | title | title?: string | title | Optional |
| email | VARCHAR(255) | email | email?: string | email | Optional |
| phone | VARCHAR(20) | phone | phone?: string | phone | Optional |
| mobile | VARCHAR(20) | mobile | mobile?: string | mobile | Optional |
| isPrimary | Boolean | isPrimary | isPrimary: boolean | isPrimary | Default: false |
| remark | TEXT | remark | remark?: string | **MISSING** | **Not in form** |
| createdAt | DateTime | createdAt | createdAt: string | - | Auto-generated |
| updatedAt | DateTime | updatedAt | **MISSING** | - | **DB has it, frontend lacks it** |

**Issues Found:**
1. **Frontend CompanyContact type is missing updatedAt field**
2. **Frontend CompanyContact type has sortOrder which does NOT exist in DB schema**
3. **CompanyForm does not include departmentId dropdown for contacts**
4. **CompanyForm does not include remark field for contacts**

---

## 3. CRUD Operations Analysis

### 3.1 Create Company (POST /api/companies)

**Backend Validation (Zod Schema):**
```typescript
const companySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  nameKana: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().max(500).optional().nullable().or(z.literal('')),
  industry: z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional().default('ACTIVE'),
  remark: z.string().optional().nullable(),
});
```

**Request Body (companyCreateSchema):**
```typescript
{
  code: string;          // Required
  name: string;          // Required
  nameKana?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  website?: string;
  industry?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  remark?: string;
  offices?: Array<{
    name: string;
    postalCode?: string;
    address?: string;
    phone?: string;
    isHeadquarters?: boolean;
  }>;
  contacts?: Array<{
    name: string;
    nameKana?: string;
    title?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    isPrimary?: boolean;
    remark?: string;
  }>;
}
```

**Response (201 Created):**
```typescript
{
  success: true,
  data: Company & {
    offices: CompanyOffice[];
    contacts: CompanyContact[];
    _count: { offices, departments, contacts, projects };
  }
}
```

**Issues:**
1. **departments array in CreateCompanyRequest (frontend type) cannot be created during company creation** - The backend companyCreateSchema does NOT support departments array. Frontend type has it but API ignores it.

### 3.2 Read Company (GET /api/companies/:id)

**Response:**
```typescript
{
  success: true,
  data: Company & {
    offices: CompanyOffice[];
    departments: CompanyDepartment[] (hierarchical with children, up to 3 levels);
    contacts: CompanyContact[] (with department info);
    projects: Project[] (latest 10);
  }
}
```

**Notes:**
- Departments are returned only at root level (parentId: null) with nested children
- Projects are limited to 10 most recent

### 3.3 Update Company (PUT /api/companies/:id)

**Request Body:**
Same as Create but all fields are optional (partial update).

**Behavior:**
- If `offices` array is provided, ALL existing offices are DELETED and replaced
- If `contacts` array is provided, ALL existing contacts are DELETED and replaced
- **departments are NOT updatable via this endpoint** - must use separate department endpoints

### 3.4 Delete Company (DELETE /api/companies/:id)

**Cascade Behavior (from Prisma schema):**
- Deletes all related offices (onDelete: Cascade)
- Deletes all related departments (onDelete: Cascade)
- Deletes all related contacts (onDelete: Cascade)
- Deletes all related projects (onDelete: Cascade)

---

## 4. Nested Objects Management

### 4.1 Offices Management

**Dedicated Endpoints:**
- `GET /api/companies/:companyId/offices` - List offices
- `POST /api/companies/:companyId/offices` - Add office
- `PUT /api/companies/:companyId/offices/:id` - Update office
- `DELETE /api/companies/:companyId/offices/:id` - Delete office

**Frontend Integration:**
- CompanyForm: Inline editing within company form (add/remove/edit)
- useCompanies hook: Does NOT expose these dedicated endpoints

**Issue:**
- **useCompanies hook lacks functions to manage offices independently**
- Currently only supports bulk replace via company update

### 4.2 Departments Management

**Dedicated Endpoints:**
- `GET /api/companies/:companyId/departments` - List all (flat)
- `GET /api/companies/:companyId/departments/tree` - Get as tree
- `POST /api/companies/:companyId/departments` - Add department
- `PUT /api/companies/:companyId/departments/:id` - Update department
- `DELETE /api/companies/:companyId/departments/:id` - Delete department

**Frontend Integration:**
- **CompanyForm: NO UI for departments** - Critical missing feature
- **CompanyDetail: Displays hierarchy but NO edit capability**
- **useCompanies hook: Does NOT expose department management functions**

**Validation Rules:**
- parentId must belong to same company
- officeId must belong to same company
- Cannot set self as parent (circular reference check)
- Cannot delete department with children

### 4.3 Contacts Management

**Dedicated Endpoints:**
- `GET /api/companies/:companyId/contacts` - List contacts
- `POST /api/companies/:companyId/contacts` - Add contact
- `PUT /api/companies/:companyId/contacts/:id` - Update contact
- `DELETE /api/companies/:companyId/contacts/:id` - Delete contact

**Frontend Integration:**
- CompanyForm: Inline editing within company form
- **departmentId field: NOT exposed in form**
- **remark field: NOT exposed in form**

---

## 5. Validation Rules Summary

### 5.1 Backend Validation (Zod)

| Field | Validation Rules |
|-------|-----------------|
| code | min(1), max(50), unique |
| name | min(1), max(200) |
| nameKana | max(200) |
| postalCode | max(10) |
| phone | max(20) |
| website | max(500), can be empty string |
| industry | max(100) |
| status | enum: ACTIVE, INACTIVE, TERMINATED |
| email (contacts) | valid email format, max(255), can be empty |
| type (departments) | enum: DIVISION, DEPARTMENT, SECTION, UNIT, OTHER |

### 5.2 Frontend Validation

**CompanyForm.tsx: Limited validation**
- Only `required` attribute on code and name fields
- No max length validation on inputs
- No format validation

**Issue:**
- **Frontend lacks comprehensive validation that matches backend**

---

## 6. Department Hierarchy Implementation

### 6.1 Database Design

```prisma
model CompanyDepartment {
  id          String              @id @default(uuid())
  companyId   String              @map("company_id")
  officeId    String?             @map("office_id")
  parentId    String?             @map("parent_id")
  type        DepartmentType
  name        String
  sortOrder   Int                 @default(0)

  parent      CompanyDepartment?  @relation("DepartmentHierarchy", ...)
  children    CompanyDepartment[] @relation("DepartmentHierarchy")
}

enum DepartmentType {
  DIVISION    // 事業部
  DEPARTMENT  // 部
  SECTION     // 課
  UNIT        // 係
  OTHER       // その他
}
```

### 6.2 API Tree Endpoint

`GET /api/companies/:companyId/departments/tree`

Returns nested structure up to 4 levels deep:
```
Root (parentId: null)
  ├── Level 1 (children)
  │     ├── Level 2 (children.children)
  │     │     └── Level 3 (children.children.children)
```

### 6.3 Frontend Implementation Status

| Feature | Status |
|---------|--------|
| Display hierarchy in CompanyDetail | Implemented |
| Add/Edit/Delete departments | **NOT IMPLEMENTED** |
| Tree editor UI | **NOT IMPLEMENTED** |
| DepartmentType selection | **NOT IMPLEMENTED** |
| Office association | **NOT IMPLEMENTED** |

---

## 7. Inconsistencies and Issues Summary

### 7.1 Critical Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Company type missing postalCode, address, phone | HIGH | frontend/src/types/index.ts |
| CompanyDepartment missing officeId, type, updatedAt | HIGH | frontend/src/types/index.ts |
| DepartmentType enum not defined | HIGH | frontend/src/types/index.ts |
| No department management UI | HIGH | frontend/src/pages/CompanyForm.tsx |
| CompanyContact has sortOrder (not in DB) | MEDIUM | frontend/src/types/index.ts |
| Contact departmentId not in form | MEDIUM | frontend/src/pages/CompanyForm.tsx |
| Contact remark not in form | LOW | frontend/src/pages/CompanyForm.tsx |
| CreateCompanyRequest has departments (not supported) | MEDIUM | frontend/src/types/index.ts |

### 7.2 Missing Features

1. **Department Management UI** - No way to create/edit/delete departments from frontend
2. **Department Type Selection** - Type enum exists in DB but not exposed
3. **Office-Department Association** - officeId exists but not used
4. **Dedicated Hooks** - useCompanies lacks office/department/contact management functions
5. **Frontend Validation** - Missing max length and format validations

### 7.3 API Design Notes

- Company create/update uses "delete-all-and-recreate" pattern for offices and contacts
- This causes ID changes on every update, which could break external references
- Departments are completely separate from company CRUD

---

## 8. Recommendations

### 8.1 Immediate Fixes Required

1. Update `frontend/src/types/index.ts`:
   - Add missing fields to Company interface (postalCode, address, phone)
   - Add missing fields to CompanyDepartment (officeId, type, updatedAt)
   - Add DepartmentType enum
   - Remove sortOrder from CompanyContact (doesn't exist in DB)
   - Add updatedAt to CompanyOffice and CompanyContact

2. Update CreateCompanyRequest:
   - Remove departments array (not supported by API)
   - OR implement department creation in API

### 8.2 Feature Enhancements

1. Create department management UI component
2. Add useCompanyDepartments, useCompanyOffices, useCompanyContacts hooks
3. Implement proper form validation matching backend rules
4. Consider implementing partial update (PATCH) for nested objects instead of full replacement

---

## 9. File References

| Layer | File Path |
|-------|-----------|
| Database Schema | C:\dev\EmployeeDB\backend\prisma\schema.prisma (Lines 163-276) |
| Backend Routes | C:\dev\EmployeeDB\backend\src\routes\companies.ts (1113 lines) |
| Frontend Types | C:\dev\EmployeeDB\frontend\src\types\index.ts (Lines 322-555) |
| Company Form | C:\dev\EmployeeDB\frontend\src\pages\CompanyForm.tsx (405 lines) |
| Company List | C:\dev\EmployeeDB\frontend\src\pages\CompanyList.tsx (332 lines) |
| Company Detail | C:\dev\EmployeeDB\frontend\src\pages\CompanyDetail.tsx (377 lines) |
| Companies Hook | C:\dev\EmployeeDB\frontend\src\hooks\useCompanies.ts (111 lines) |
| API Config | C:\dev\EmployeeDB\frontend\src\api\config.ts (Lines 149-159) |

---

**Report Generated**: 2026-02-04
**Audit Scope**: Complete Company module (DB, API, Frontend)
