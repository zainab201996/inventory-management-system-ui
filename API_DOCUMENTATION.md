# API Documentation

## Base URL

All API endpoints are prefixed with `/api` except the health check endpoint.

**Default Port:** 7076 (configurable via `PORT` environment variable)

## Authentication

Most endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

### Public Endpoints

- `GET /health` - Health check (no auth required)
- `POST /api/auth/login` - Login with username/password (returns JWT token)
- `POST /api/auth/verify` - Verify JWT token (token can be in header or body)

### Protected Endpoints

All other endpoints require authentication via JWT token.

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error message"
}
```

## Endpoints

### Health Check

#### GET /health
Check server health and database connection.

**Response:**
```json
{
  "success": true,
  "message": "PD Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45
}
```

---

### Authentication

#### POST /api/auth/login
Login with username and password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "is_active": true,
      "role_id": 1,
      "department_id": 1,
      "region_id": 1,
      "division_id": 1,
      "site_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "role": {
        "id": 1,
        "name": "Admin / IT Cell"
      },
      "department": {
        "id": 1,
        "name": "Both"
      },
      "region": {
        "id": 1,
        "name": "Region 1"
      },
      "division": {
        "id": 1,
        "name": "Division 1-1"
      },
      "site": {
        "id": 1,
        "name": "Site 1-1-1"
      },
      "permissions": [
        "add_business_plan_projects",
        "approve_project_initiation",
        "update_progress",
        "monitor_progress",
        "manage_users"
      ]
    },
    "token": "jwt_token_here"
  }
}
```

**Error Responses:**
- `400` - Username and password are required
- `401` - Invalid username or password
- `401` - Account is inactive

#### POST /api/auth/verify
Verify JWT token and get user information.

**Headers:**
```
Authorization: Bearer <token>
```

**OR Request Body:**
```json
{
  "token": "jwt_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token verified successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "is_active": true,
      "role_id": 1,
      "department_id": 1,
      "region_id": 1,
      "division_id": 1,
      "site_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "permissions": ["add_business_plan_projects", "manage_users", ...]
    },
    "token": "jwt_token_here"
  }
}
```

**Error Responses:**
- `401` - No token provided
- `401` - Invalid token
- `401` - User not found
- `401` - User account is inactive

---

### Users

#### GET /api/users
Get all users with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by username (case-insensitive)
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order - asc/desc (default: desc)

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "is_active": true,
        "role_id": 1,
        "department_id": 1,
        "region_id": 1,
        "division_id": 1,
        "site_id": 1,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z",
        "role": {
          "id": 1,
          "name": "Admin / IT Cell"
        },
        "department": {
          "id": 1,
          "name": "Both"
        },
        "region": {
          "id": 1,
          "name": "Region 1"
        },
        "division": {
          "id": 1,
          "name": "Division 1-1"
        },
        "site": {
          "id": 1,
          "name": "Site 1-1-1"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "total_pages": 10
    }
  }
}
```

#### POST /api/users
Create a new user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "role_id": 1,
  "department_id": 1,
  "region_id": 1,
  "division_id": 1,
  "site_id": 1
}
```

**Field Constraints:**
- `username`: Maximum 100 characters
- `password`: Will be hashed and stored (hash limit: 255 characters)

**Note:** `region_id`, `division_id`, and `site_id` are optional. If provided, they must follow the hierarchy: Region → Division → Site.

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 2,
    "username": "newuser",
    "is_active": true,
    "role_id": 1,
    "department_id": 1,
    "region_id": 1,
    "division_id": 1,
    "site_id": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Username, password, role_id, and department_id are required
- `400` - Username already exists

#### GET /api/users/:id
Get user by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "username": "admin",
    "is_active": true,
    "role_id": 1,
    "department_id": 1,
    "region_id": 1,
    "division_id": 1,
    "site_id": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "role": { "id": 1, "name": "Admin / IT Cell" },
    "department": { "id": 1, "name": "Both" },
    "region": { "id": 1, "name": "Region 1" },
    "division": { "id": 1, "name": "Division 1-1" },
    "site": { "id": 1, "name": "Site 1-1-1" }
  }
}
```

**Error Responses:**
- `400` - Invalid user ID
- `404` - User not found

#### PUT /api/users/:id
Update user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "updateduser",
  "password": "newpassword123",
  "role_id": 2,
  "department_id": 2,
  "region_id": 2,
  "division_id": 2,
  "site_id": 2,
  "is_active": true
}
```

**Field Constraints:**
- `username`: Maximum 100 characters
- `password`: Will be hashed and stored (hash limit: 255 characters)

**Note:** All fields are optional. Only include fields you want to update.

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 1,
    "username": "updateduser",
    "is_active": true,
    "role_id": 2,
    "department_id": 2,
    "region_id": 2,
    "division_id": 2,
    "site_id": 2,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid user ID
- `400` - Username already exists
- `404` - User not found

#### DELETE /api/users/:id
Delete user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400` - Invalid user ID
- `404` - User not found
- `500` - Failed to delete user

---

### Roles

#### GET /api/roles
Get all roles with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `all=true` (optional): Get all roles without pagination
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order - asc/desc (default: desc)

**Response (with pagination):**
```json
{
  "success": true,
  "message": "Roles retrieved successfully",
  "data": {
    "roles": [
      {
        "id": 1,
        "name": "Admin / IT Cell",
        "description": "Admin / IT Cell role",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

**Response (with all=true):**
```json
{
  "success": true,
  "message": "Roles retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Admin / IT Cell",
      "description": "Admin / IT Cell role",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/roles
Create a new role.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Role",
  "description": "Role description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

**Response:**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": 6,
    "name": "New Role",
    "description": "Role description",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Name is required
- `400` - Role name already exists

#### GET /api/roles/:id
Get role by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Role retrieved successfully",
  "data": {
    "id": 1,
    "name": "Admin / IT Cell",
    "description": "Admin / IT Cell role",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/roles/:id
Update role.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Role Name",
  "description": "Updated description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

**Response:**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Role Name",
    "description": "Updated description",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid role ID
- `400` - Role name already exists
- `404` - Role not found

#### DELETE /api/roles/:id
Delete role.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Role deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400` - Invalid role ID
- `400` - Cannot delete role that is assigned to users
- `404` - Role not found

---

### Departments

#### GET /api/departments
Get all departments with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `all=true` (optional): Get all departments without pagination
- `page`, `limit`, `sort_by`, `sort_order` - Pagination options (same as roles)

**Response:** Same format as roles endpoint.

#### POST /api/departments
Create a new department.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Department",
  "description": "Department description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

**Response:** Same format as roles endpoint.

#### GET /api/departments/:id
Get department by ID.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT /api/departments/:id
Update department.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Department Name",
  "description": "Updated description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

**Note:** All fields are optional. Only include fields you want to update.

#### DELETE /api/departments/:id
Delete department.

**Headers:**
```
Authorization: Bearer <token>
```

**Error Responses:**
- `400` - Cannot delete department that is assigned to users

---

### Regions

#### GET /api/regions
Get all regions with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `all=true` (optional): Get all regions without pagination
- `page`, `limit`, `sort_by`, `sort_order` - Pagination options

#### POST /api/regions
Create a new region.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Region",
  "description": "Region description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

#### GET /api/regions/:id
Get region by ID.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT /api/regions/:id
Update region.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Region Name",
  "description": "Updated description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

**Note:** All fields are optional. Only include fields you want to update.

#### DELETE /api/regions/:id
Delete region.

**Headers:**
```
Authorization: Bearer <token>
```

**Error Responses:**
- `400` - Cannot delete region that has divisions

---

### Divisions

#### GET /api/divisions
Get all divisions with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `region_id` (optional): Filter by region ID
- `all=true&region_id=1` (optional): Get all divisions for a specific region
- `page`, `limit`, `sort_by`, `sort_order` - Pagination options

**Example:**
```
GET /api/divisions?region_id=1
GET /api/divisions?all=true&region_id=1
```

#### POST /api/divisions
Create a new division.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Division",
  "region_id": 1,
  "description": "Division description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

**Required Fields:** `name`, `region_id`

**Error Responses:**
- `400` - Name and region_id are required
- `400` - Division name already exists for this region
- `400` - Invalid region_id

#### GET /api/divisions/:id
Get division by ID.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT /api/divisions/:id
Update division.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Division Name",
  "region_id": 2,
  "description": "Updated description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

#### DELETE /api/divisions/:id
Delete division.

**Headers:**
```
Authorization: Bearer <token>
```

**Error Responses:**
- `400` - Cannot delete division that has sites

---

### Sites

#### GET /api/sites
Get all sites with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `division_id` (optional): Filter by division ID
- `all=true&division_id=1` (optional): Get all sites for a specific division
- `page`, `limit`, `sort_by`, `sort_order` - Pagination options

**Example:**
```
GET /api/sites?division_id=1
GET /api/sites?all=true&division_id=1
```

#### POST /api/sites
Create a new site.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Site",
  "division_id": 1,
  "description": "Site description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

**Required Fields:** `name`, `division_id`

**Error Responses:**
- `400` - Name and division_id are required
- `400` - Site name already exists for this division
- `400` - Invalid division_id

#### GET /api/sites/:id
Get site by ID.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT /api/sites/:id
Update site.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Site Name",
  "division_id": 2,
  "description": "Updated description"
}
```

**Field Constraints:**
- `name`: Maximum 100 characters
- `description`: TEXT field (unlimited length)

#### DELETE /api/sites/:id
Delete site.

**Headers:**
```
Authorization: Bearer <token>
```

**Error Responses:**
- `400` - Cannot delete site that is assigned to users

---

### Project Types

#### GET /api/project-types
Get all project types with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `all=true` (optional): Get all project types without pagination
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order - asc/desc (default: desc)

**Response (with pagination):**
```json
{
  "success": true,
  "message": "Project types retrieved successfully",
  "data": {
    "projectTypes": [
      {
        "ptype_id": 1,
        "ptype_name": "Construction",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

**Response (with all=true):**
```json
{
  "success": true,
  "message": "Project types retrieved successfully",
  "data": [
    {
      "ptype_id": 1,
      "ptype_name": "Construction",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/project-types
Create a new project type.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ptype_name": "New Project Type"
}
```

**Field Constraints:**
- `ptype_name`: Maximum 100 characters

**Response:**
```json
{
  "success": true,
  "message": "Project type created successfully",
  "data": {
    "ptype_id": 1,
    "ptype_name": "New Project Type",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Project type name is required
- `400` - Project type name already exists

#### GET /api/project-types/:id
Get project type by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project type retrieved successfully",
  "data": {
    "ptype_id": 1,
    "ptype_name": "Construction",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid project type ID
- `404` - Project type not found

#### PUT /api/project-types/:id
Update project type.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ptype_name": "Updated Project Type Name"
}
```

**Field Constraints:**
- `ptype_name`: Maximum 100 characters

**Response:**
```json
{
  "success": true,
  "message": "Project type updated successfully",
  "data": {
    "ptype_id": 1,
    "ptype_name": "Updated Project Type Name",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid project type ID
- `400` - Project type name already exists
- `404` - Project type not found

#### DELETE /api/project-types/:id
Delete project type.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project type deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400` - Invalid project type ID
- `400` - Cannot delete project type that is assigned to projects
- `404` - Project type not found

---

### Project Types Detail

#### GET /api/project-types-detail
Get all project type details with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `ptype_id` (optional): Filter by project type ID
- `all=true&ptype_id=1` (optional): Get all details for a specific project type without pagination
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order - asc/desc (default: desc)

**Response (with pagination):**
```json
{
  "success": true,
  "message": "Project type details retrieved successfully",
  "data": {
    "details": [
      {
        "id": 1,
        "ptype_id": 1,
        "s_id": 1,
        "weightage": 25.50,
        "t_days": 30,
        "est_cost": 50000.00,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z",
        "project_type": {
          "ptype_id": 1,
          "ptype_name": "Construction"
        },
        "step": {
          "s_id": 1,
          "s_name": "Planning"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

**Response (with all=true&ptype_id=1):**
```json
{
  "success": true,
  "message": "Project type details retrieved successfully",
  "data": [
    {
      "id": 1,
      "ptype_id": 1,
      "s_id": 1,
      "weightage": 25.50,
      "t_days": 30,
      "est_cost": 50000.00,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "project_type": {
        "ptype_id": 1,
        "ptype_name": "Construction"
      },
      "step": {
        "s_id": 1,
        "s_name": "Planning"
      }
    }
  ]
}
```

#### POST /api/project-types-detail
Create a new project type detail.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ptype_id": 1,
  "s_id": 1,
  "weightage": 25.50,
  "t_days": 30,
  "est_cost": 50000.00
}
```

**Required Fields:** `ptype_id`, `s_id`

**Optional Fields:** `weightage` (default: 0), `t_days` (default: 0), `est_cost` (default: 0)

**Response:**
```json
{
  "success": true,
  "message": "Project type detail created successfully",
  "data": {
    "id": 1,
    "ptype_id": 1,
    "s_id": 1,
    "weightage": 25.50,
    "t_days": 30,
    "est_cost": 50000.00,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Project type ID and Step ID are required
- `400` - This project type and step combination already exists
- `400` - Invalid project type ID or step ID

#### GET /api/project-types-detail/:id
Get project type detail by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project type detail retrieved successfully",
  "data": {
    "id": 1,
    "ptype_id": 1,
    "s_id": 1,
    "weightage": 25.50,
    "t_days": 30,
    "est_cost": 50000.00,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "project_type": {
      "ptype_id": 1,
      "ptype_name": "Construction"
    },
    "step": {
      "s_id": 1,
      "s_name": "Planning"
    }
  }
}
```

**Error Responses:**
- `400` - Invalid project type detail ID
- `404` - Project type detail not found

#### PUT /api/project-types-detail/:id
Update project type detail.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ptype_id": 2,
  "s_id": 2,
  "weightage": 30.00,
  "t_days": 45,
  "est_cost": 75000.00
}
```

**Note:** All fields are optional. Only include fields you want to update.

**Response:**
```json
{
  "success": true,
  "message": "Project type detail updated successfully",
  "data": {
    "id": 1,
    "ptype_id": 2,
    "s_id": 2,
    "weightage": 30.00,
    "t_days": 45,
    "est_cost": 75000.00,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid project type detail ID
- `400` - This project type and step combination already exists
- `400` - Invalid project type ID or step ID
- `404` - Project type detail not found

#### DELETE /api/project-types-detail/:id
Delete project type detail.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project type detail deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400` - Invalid project type detail ID
- `404` - Project type detail not found

---

### Delay Reasons

#### GET /api/delay-reasons
Get all delay reasons with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `all=true` (optional): Get all delay reasons without pagination
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order - asc/desc (default: desc)

**Response (with pagination):**
```json
{
  "success": true,
  "message": "Delay reasons retrieved successfully",
  "data": {
    "delayReasons": [
      {
        "d_id": 1,
        "d_name": "Weather Conditions",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

**Response (with all=true):**
```json
{
  "success": true,
  "message": "Delay reasons retrieved successfully",
  "data": [
    {
      "d_id": 1,
      "d_name": "Weather Conditions",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/delay-reasons
Create a new delay reason.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "d_name": "New Delay Reason"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delay reason created successfully",
  "data": {
    "d_id": 1,
    "d_name": "New Delay Reason",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Delay reason name is required
- `400` - Delay reason name already exists

#### GET /api/delay-reasons/:id
Get delay reason by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Delay reason retrieved successfully",
  "data": {
    "d_id": 1,
    "d_name": "Weather Conditions",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid delay reason ID
- `404` - Delay reason not found

#### PUT /api/delay-reasons/:id
Update delay reason.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "d_name": "Updated Delay Reason Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delay reason updated successfully",
  "data": {
    "d_id": 1,
    "d_name": "Updated Delay Reason Name",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid delay reason ID
- `400` - Delay reason name already exists
- `404` - Delay reason not found

#### DELETE /api/delay-reasons/:id
Delete delay reason.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Delay reason deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400` - Invalid delay reason ID
- `400` - Cannot delete delay reason that is assigned to projects
- `404` - Delay reason not found

---

### Steps

#### GET /api/steps
Get all steps with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `all=true` (optional): Get all steps without pagination
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order - asc/desc (default: desc)

**Response (with pagination):**
```json
{
  "success": true,
  "message": "Steps retrieved successfully",
  "data": {
    "steps": [
      {
        "s_id": 1,
        "s_name": "Planning",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

**Response (with all=true):**
```json
{
  "success": true,
  "message": "Steps retrieved successfully",
  "data": [
    {
      "s_id": 1,
      "s_name": "Planning",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/steps
Create a new step.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "s_name": "New Step"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Step created successfully",
  "data": {
    "s_id": 1,
    "s_name": "New Step",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Step name is required
- `400` - Step name already exists

#### GET /api/steps/:id
Get step by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Step retrieved successfully",
  "data": {
    "s_id": 1,
    "s_name": "Planning",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid step ID
- `404` - Step not found

#### PUT /api/steps/:id
Update step.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "s_name": "Updated Step Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Step updated successfully",
  "data": {
    "s_id": 1,
    "s_name": "Updated Step Name",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid step ID
- `400` - Step name already exists
- `404` - Step not found

#### DELETE /api/steps/:id
Delete step.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Step deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400` - Invalid step ID
- `400` - Cannot delete step that is assigned to projects
- `404` - Step not found

---

### Business Plans

#### GET /api/business-plans
Get all business plans with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `all=true` (optional): Get all business plans without pagination
- `ptype_id` (optional): Filter by project type ID
- `dept_id` (optional): Filter by department ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order - asc/desc (default: desc)

**Response (with pagination):**
```json
{
  "success": true,
  "message": "Business plans retrieved successfully",
  "data": {
    "businessPlans": [
      {
        "proj_id": 1,
        "ptype_id": 1,
        "dept_id": 1,
        "proj_name": "New Construction Project",
        "start_date": "2024-01-01",
        "completion_date": "2024-12-31",
        "created_at": "2024-01-01T00:00:00.000Z",
        "project_type": {
          "ptype_id": 1,
          "ptype_name": "Construction"
        },
        "department": {
          "dept_id": 1,
          "name": "Both"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

**Response (with all=true):**
```json
{
  "success": true,
  "message": "Business plans retrieved successfully",
  "data": [
    {
      "proj_id": 1,
      "ptype_id": 1,
      "dept_id": 1,
      "proj_name": "New Construction Project",
      "start_date": "2024-01-01",
      "completion_date": "2024-12-31",
      "created_at": "2024-01-01T00:00:00.000Z",
      "project_type": {
        "ptype_id": 1,
        "ptype_name": "Construction"
      },
      "department": {
        "dept_id": 1,
        "name": "Both"
      }
    }
  ]
}
```

#### POST /api/business-plans
Create a new business plan.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ptype_id": 1,
  "dept_id": 1,
  "proj_name": "New Construction Project",
  "start_date": "2024-01-01",
  "completion_date": "2024-12-31"
}
```

**Required Fields:** `ptype_id`, `dept_id`, `proj_name`

**Optional Fields:** `start_date` (nullable), `completion_date` (nullable)

**Response:**
```json
{
  "success": true,
  "message": "Business plan created successfully",
  "data": {
    "proj_id": 1,
    "ptype_id": 1,
    "dept_id": 1,
    "proj_name": "New Construction Project",
    "start_date": "2024-01-01",
    "completion_date": "2024-12-31",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Project type ID, Department ID, and Project name are required
- `400` - Invalid project type ID or department ID

#### GET /api/business-plans/:id
Get business plan by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Business plan retrieved successfully",
  "data": {
    "proj_id": 1,
    "ptype_id": 1,
    "dept_id": 1,
    "proj_name": "New Construction Project",
    "start_date": "2024-01-01",
    "completion_date": "2024-12-31",
    "created_at": "2024-01-01T00:00:00.000Z",
    "project_type": {
      "ptype_id": 1,
      "ptype_name": "Construction"
    },
    "department": {
      "dept_id": 1,
      "name": "Both"
    }
  }
}
```

**Error Responses:**
- `400` - Invalid business plan ID
- `404` - Business plan not found

#### PUT /api/business-plans/:id
Update business plan.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ptype_id": 2,
  "dept_id": 2,
  "proj_name": "Updated Project Name",
  "start_date": "2024-02-01",
  "completion_date": null
}
```

**Note:** All fields are optional. Only include fields you want to update. Use `null` to clear date fields.

**Response:**
```json
{
  "success": true,
  "message": "Business plan updated successfully",
  "data": {
    "proj_id": 1,
    "ptype_id": 2,
    "dept_id": 2,
    "proj_name": "Updated Project Name",
    "start_date": "2024-02-01",
    "completion_date": null,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid business plan ID
- `400` - Invalid project type ID or department ID
- `404` - Business plan not found

#### DELETE /api/business-plans/:id
Delete business plan.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Business plan deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400` - Invalid business plan ID
- `404` - Business plan not found

---

## Error Codes

- `400` - Bad Request (validation error, duplicate entry, foreign key violation)
- `401` - Unauthorized (authentication required, invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (database connection issues)

## Example Requests

### Using cURL

```bash
# Health check
curl http://localhost:7076/health

# Login to get JWT token
curl -X POST http://localhost:7076/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save token from response, then use it:
TOKEN="your_jwt_token_here"

# Get users
curl http://localhost:7076/api/users \
  -H "Authorization: Bearer $TOKEN"

# Get all roles (without pagination)
curl "http://localhost:7076/api/roles?all=true" \
  -H "Authorization: Bearer $TOKEN"

# Create user
curl -X POST http://localhost:7076/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "role_id": 1,
    "department_id": 1
  }'

# Get divisions for a region
curl "http://localhost:7076/api/divisions?region_id=1" \
  -H "Authorization: Bearer $TOKEN"

# Get all sites for a division
curl "http://localhost:7076/api/sites?all=true&division_id=1" \
  -H "Authorization: Bearer $TOKEN"

# Get all project types (without pagination)
curl "http://localhost:7076/api/project-types?all=true" \
  -H "Authorization: Bearer $TOKEN"

# Get all project types (without pagination)
curl "http://localhost:7076/api/project-types?all=true" \
  -H "Authorization: Bearer $TOKEN"

# Create project type
curl -X POST http://localhost:7076/api/project-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ptype_name": "Construction"
  }'

# Get all project type details for a project type
curl "http://localhost:7076/api/project-types-detail?all=true&ptype_id=1" \
  -H "Authorization: Bearer $TOKEN"

# Create project type detail
curl -X POST http://localhost:7076/api/project-types-detail \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ptype_id": 1,
    "s_id": 1,
    "weightage": 25.50,
    "t_days": 30,
    "est_cost": 50000.00
  }'

# Get all delay reasons (without pagination)
curl "http://localhost:7076/api/delay-reasons?all=true" \
  -H "Authorization: Bearer $TOKEN"

# Create delay reason
curl -X POST http://localhost:7076/api/delay-reasons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "d_name": "Weather Conditions"
  }'

# Get all steps (without pagination)
curl "http://localhost:7076/api/steps?all=true" \
  -H "Authorization: Bearer $TOKEN"

# Create step
curl -X POST http://localhost:7076/api/steps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "s_name": "Planning"
  }'

# Get all business plans (without pagination)
curl "http://localhost:7076/api/business-plans?all=true" \
  -H "Authorization: Bearer $TOKEN"

# Get business plans filtered by project type
curl "http://localhost:7076/api/business-plans?ptype_id=1" \
  -H "Authorization: Bearer $TOKEN"

# Create business plan
curl -X POST http://localhost:7076/api/business-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ptype_id": 1,
    "dept_id": 1,
    "proj_name": "New Construction Project",
    "start_date": "2024-01-01",
    "completion_date": "2024-12-31"
  }'
```

### Using JavaScript (fetch)

```javascript
// Login to get JWT token
const loginResponse = await fetch('http://localhost:7076/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Get users
const usersResponse = await fetch('http://localhost:7076/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const usersData = await usersResponse.json();

// Create user
const createResponse = await fetch('http://localhost:7076/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    username: 'newuser',
    password: 'password123',
    role_id: 1,
    department_id: 1
  })
});
```

## Notes

- All timestamps are in ISO 8601 format
- Pagination defaults to 10 items per page
- Search is case-insensitive
- Foreign key constraints prevent deletion of referenced records
- Profile hierarchy: Region → Division → Site (must be set in order)
- JWT tokens expire after 30 days (configurable via `JWT_EXPIRES_IN` environment variable)
- All protected endpoints require `Authorization: Bearer <token>` header
- Health check endpoint does not require authentication
