# POST /api/projects API Test Report

## Test Overview

**Test Date**: 2026-02-03
**API Endpoint**: `POST /api/projects`
**Test Method**: curl (manual API testing)
**Server Status**: Running on localhost:3000

---

## Endpoint Specification

### Request

- **Method**: POST
- **URL**: `/api/projects`
- **Authentication**: Required (JWT Bearer Token)
- **Authorization**: requireEditor (ADMIN or EDITOR role)
- **Content-Type**: application/json

### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | Project code (1-50 chars) |
| name | string | Yes | Project name (1-200 chars) |
| description | string | No | Project description |
| companyId | UUID | Yes | Company ID |
| departmentId | UUID | No | Company department ID |
| contractType | enum | Yes | DISPATCH / SES / CONTRACT |
| contractStartDate | string (date) | No | Contract start date |
| contractEndDate | string (date) | No | Contract end date |
| deliveryDate | string (date) | No | Delivery date |
| budget | number | No | Budget amount |
| unitPrice | number | No | Unit price |
| status | enum | No | PROPOSAL / IN_PROGRESS / COMPLETED / CANCELLED / ON_HOLD (default: PROPOSAL) |
| location | string | No | Work location (max 200 chars) |
| remark | string | No | Remarks |

### Response

**Success (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "UUID",
    "companyId": "UUID",
    "departmentId": "UUID | null",
    "code": "string",
    "name": "string",
    "description": "string | null",
    "contractType": "enum",
    "contractStartDate": "datetime | null",
    "contractEndDate": "datetime | null",
    "deliveryDate": "datetime | null",
    "budget": "number | null",
    "unitPrice": "number | null",
    "status": "enum",
    "location": "string | null",
    "remark": "string | null",
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "company": { ... },
    "department": { ... | null },
    "assignments": []
  }
}
```

---

## Test Results

### Test 1: Required Fields Only

**Status**: PASS

**Request**:
```json
{
  "code": "TEST_PRJ001",
  "name": "Test Project Required Only",
  "companyId": "d5de3023-82f2-4460-9a2d-5689466383b5",
  "contractType": "SES"
}
```

**Response**: HTTP 201 Created
```json
{
  "success": true,
  "data": {
    "id": "ff5ede18-ab9e-4889-aa70-54a3b7590ab4",
    "companyId": "d5de3023-82f2-4460-9a2d-5689466383b5",
    "departmentId": null,
    "code": "TEST_PRJ001",
    "name": "Test Project Required Only",
    "description": null,
    "contractType": "SES",
    "contractStartDate": null,
    "contractEndDate": null,
    "deliveryDate": null,
    "budget": null,
    "unitPrice": null,
    "status": "PROPOSAL",
    "location": null,
    "remark": null,
    "createdAt": "2026-02-03T09:44:37.298Z",
    "updatedAt": "2026-02-03T09:44:37.298Z",
    "company": {
      "id": "d5de3023-82f2-4460-9a2d-5689466383b5",
      "code": "COMP001",
      "name": "株式会社テックソリューションズ"
    },
    "department": null,
    "assignments": []
  }
}
```

**Notes**:
- Default status "PROPOSAL" is correctly applied
- Optional fields are null as expected
- Company relationship is properly included

---

### Test 2: All Fields

**Status**: PASS

**Request**:
```json
{
  "code": "TEST_PRJ002",
  "name": "Test Project All Fields",
  "description": "This is a test project with all fields filled.",
  "companyId": "d5de3023-82f2-4460-9a2d-5689466383b5",
  "departmentId": "a08baefa-45c7-464b-be2c-6c78d8f33b51",
  "contractType": "CONTRACT",
  "contractStartDate": "2025-04-01",
  "contractEndDate": "2025-12-31",
  "deliveryDate": "2025-11-30",
  "budget": 50000000,
  "unitPrice": 800000,
  "status": "PROPOSAL",
  "location": "Tokyo Office",
  "remark": "Test remark for project"
}
```

**Response**: HTTP 201 Created
```json
{
  "success": true,
  "data": {
    "id": "292483a4-4667-4339-aff9-ea91d63217b0",
    "companyId": "d5de3023-82f2-4460-9a2d-5689466383b5",
    "departmentId": "a08baefa-45c7-464b-be2c-6c78d8f33b51",
    "code": "TEST_PRJ002",
    "name": "Test Project All Fields",
    "description": "This is a test project with all fields filled.",
    "contractType": "CONTRACT",
    "contractStartDate": "2025-04-01T00:00:00.000Z",
    "contractEndDate": "2025-12-31T00:00:00.000Z",
    "deliveryDate": "2025-11-30T00:00:00.000Z",
    "budget": "50000000",
    "unitPrice": "800000",
    "status": "PROPOSAL",
    "location": "Tokyo Office",
    "remark": "Test remark for project",
    "createdAt": "2026-02-03T09:44:41.680Z",
    "updatedAt": "2026-02-03T09:44:41.680Z",
    "company": { "..." },
    "department": {
      "id": "a08baefa-45c7-464b-be2c-6c78d8f33b51",
      "name": "IT事業部",
      "type": "DIVISION"
    },
    "assignments": []
  }
}
```

**Notes**:
- All fields correctly saved
- Date strings converted to ISO datetime format
- Department relationship properly linked
- Budget/unitPrice returned as string (BigInt handling)

---

### Test 3: Non-existent companyId

**Status**: PASS (Expected Error)

**Request**:
```json
{
  "code": "TEST_PRJ003",
  "name": "Test Project Invalid Company",
  "companyId": "00000000-0000-0000-0000-000000000000",
  "contractType": "SES"
}
```

**Response**: HTTP 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "指定された企業が見つかりません"
  }
}
```

**Notes**:
- Company existence is validated before creation
- Appropriate error message in Japanese

---

### Test 4: Validation Error Cases

#### Test 4a: Missing code

**Status**: PASS (Expected Error)

**Response**: HTTP 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{ "field": "code", "message": "Required" }]
  }
}
```

---

#### Test 4b: Missing name

**Status**: PASS (Expected Error)

**Response**: HTTP 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{ "field": "name", "message": "Required" }]
  }
}
```

---

#### Test 4c: Invalid companyId format

**Status**: PASS (Expected Error)

**Request**: `companyId: "invalid-uuid"`

**Response**: HTTP 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{ "field": "companyId", "message": "有効な企業IDを指定してください" }]
  }
}
```

---

#### Test 4d: Invalid contractType enum

**Status**: PASS (Expected Error)

**Request**: `contractType: "INVALID"`

**Response**: HTTP 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{
      "field": "contractType",
      "message": "Invalid enum value. Expected 'DISPATCH' | 'SES' | 'CONTRACT', received 'INVALID'"
    }]
  }
}
```

---

#### Test 4e: End date before start date

**Status**: PASS (Expected Error)

**Request**:
```json
{
  "contractStartDate": "2025-12-31",
  "contractEndDate": "2025-01-01"
}
```

**Response**: HTTP 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "契約終了日は契約開始日以降である必要があります"
  }
}
```

---

### Test 5: Without Authentication

**Status**: PASS (Expected Error)

**Response**: HTTP 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

---

### Test 6: Non-existent departmentId

**Status**: PASS (Expected Error)

**Request**: `departmentId: "00000000-0000-0000-0000-000000000000"`

**Response**: HTTP 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "指定された部署が見つかりません"
  }
}
```

---

## Summary

| Test Case | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Required fields only | 201 Created | 201 Created | PASS |
| All fields | 201 Created | 201 Created | PASS |
| Non-existent companyId | 400 Bad Request | 400 Bad Request | PASS |
| Missing code | 400 Validation Error | 400 Validation Error | PASS |
| Missing name | 400 Validation Error | 400 Validation Error | PASS |
| Invalid companyId format | 400 Validation Error | 400 Validation Error | PASS |
| Invalid contractType | 400 Validation Error | 400 Validation Error | PASS |
| End date before start date | 400 Bad Request | 400 Bad Request | PASS |
| Without authentication | 401 Unauthorized | 401 Unauthorized | PASS |
| Non-existent departmentId | 400 Bad Request | 400 Bad Request | PASS |

**Total Tests**: 10
**Passed**: 10
**Failed**: 0
**Pass Rate**: 100%

---

## Cleanup

All test data (TEST_PRJ001, TEST_PRJ002) was successfully deleted after testing.

---

## Implementation Review Notes

Based on code review of `backend/src/routes/projects.ts`:

### Strengths

1. **Comprehensive Validation**: Uses Zod schema for input validation with custom error messages
2. **Entity Existence Checks**: Validates both company and department existence before creation
3. **Date Validation**: Checks that contractEndDate is not before contractStartDate
4. **Authorization**: Properly uses requireAuth and requireEditor middleware
5. **Response Includes Relations**: Returns company and department data in response

### Potential Improvements

1. **Unique Code Constraint**: No check for duplicate project codes (may rely on database constraint)
2. **Department-Company Relationship**: Could validate that departmentId belongs to the specified companyId
3. **Missing contractType Validation**: Missing field returns generic "Required" instead of Japanese message

---

## Related Files

- **API Route**: `C:\dev\EmployeeDB\backend\src\routes\projects.ts`
- **Auth Middleware**: `C:\dev\EmployeeDB\backend\src\middleware\auth.ts`
- **Error Handler**: `C:\dev\EmployeeDB\backend\src\middleware\errorHandler.ts`
- **Prisma Schema**: `C:\dev\EmployeeDB\backend\prisma\schema.prisma`
