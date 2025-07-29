# 📚 ULT FPEB - API Documentation

## 🚀 Base URL
- **Development:** `http://localhost:3001/api`
- **Production:** `https://your-domain.com/api`

## 🔐 Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@ult-fpeb.upi.edu",
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
      "email": "admin@ult-fpeb.upi.edu",
      "name": "Administrator",
      "role": "Admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

## 👥 Users API

### Get All Users
```http
GET /users
Authorization: Bearer {token}
```

### Get User by ID
```http
GET /users/{id}
Authorization: Bearer {token}
```

### Create User
```http
POST /users
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New User",
  "email": "user@example.com",
  "password": "password123",
  "role": "Receptionist",
  "phone": "081234567890"
}
```

### Update User
```http
PUT /users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "Admin"
}
```

### Delete User
```http
DELETE /users/{id}
Authorization: Bearer {token}
```

## 🏃 Visitors API

### Get All Visitors
```http
GET /visitors
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search by name or email
- `status` - Filter by status (checked_in, checked_out)
- `date` - Filter by date (YYYY-MM-DD)

### Get Visitor by ID
```http
GET /visitors/{id}
Authorization: Bearer {token}
```

### Create Visitor
```http
POST /visitors
Authorization: Bearer {token}
Content-Type: multipart/form-data

name: "John Doe"
email: "john@example.com"
phone: "081234567890"
purpose: "Meeting"
department: "IT"
photo: [file]
```

### Check-in Visitor
```http
POST /visitors/{id}/checkin
Authorization: Bearer {token}
```

### Check-out Visitor
```http
POST /visitors/{id}/checkout
Authorization: Bearer {token}
```

### Update Visitor
```http
PUT /visitors/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "phone": "081234567890",
  "purpose": "Updated Meeting",
  "department": "HR"
}
```

### Delete Visitor
```http
DELETE /visitors/{id}
Authorization: Bearer {token}
```

## 📝 Complaints API

### Get All Complaints
```http
GET /complaints
Authorization: Bearer {token}
```

### Get Complaint by ID
```http
GET /complaints/{id}
Authorization: Bearer {token}
```

### Create Complaint
```http
POST /complaints
Authorization: Bearer {token}
Content-Type: multipart/form-data

name: "Complainant Name"
email: "complainant@example.com"
phone: "081234567890"
subject: "Service Issue"
description: "Detailed description of the complaint"
urgency: "medium"
attachments: [file]
```

### Update Complaint
```http
PUT /complaints/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": "Updated Subject",
  "description": "Updated description",
  "status": "resolved",
  "urgency": "high"
}
```

### Delete Complaint
```http
DELETE /complaints/{id}
Authorization: Bearer {token}
```

## 💬 Feedback API

### Get All Feedback
```http
GET /feedback
Authorization: Bearer {token}
```

### Create Feedback
```http
POST /feedback
Content-Type: application/json

{
  "name": "Visitor Name",
  "email": "visitor@example.com",
  "rating": 5,
  "comment": "Excellent service!",
  "category": "service"
}
```

### Get Feedback by ID
```http
GET /feedback/{id}
Authorization: Bearer {token}
```

### Delete Feedback
```http
DELETE /feedback/{id}
Authorization: Bearer {token}
```

## 🏷️ Lost Items API

### Get All Lost Items
```http
GET /lost-items
Authorization: Bearer {token}
```

### Create Lost Item Report
```http
POST /lost-items
Authorization: Bearer {token}
Content-Type: multipart/form-data

reporter_name: "Reporter Name"
reporter_email: "reporter@example.com"
reporter_phone: "081234567890"
item_name: "Mobile Phone"
item_description: "Black iPhone 13"
location_lost: "Meeting Room A"
date_lost: "2025-07-04"
item_photo: [file]
```

### Update Lost Item
```http
PUT /lost-items/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "item_name": "Updated Item Name",
  "status": "found",
  "finder_name": "Finder Name",
  "date_found": "2025-07-05"
}
```

### Delete Lost Item
```http
DELETE /lost-items/{id}
Authorization: Bearer {token}
```

## 📊 Dashboard API

### Get Dashboard Statistics
```http
GET /dashboard/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visitors": {
      "total": 150,
      "today": 12,
      "checked_in": 5
    },
    "complaints": {
      "total": 25,
      "pending": 3,
      "resolved": 22
    },
    "feedback": {
      "total": 87,
      "average_rating": 4.2
    },
    "lost_items": {
      "total": 15,
      "found": 8,
      "pending": 7
    }
  }
}
```

## 🔍 Health Check

### API Health
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "ULT FPEB Backend is running",
  "timestamp": "2025-07-04T14:30:00.000Z"
}
```

## 📤 File Upload

### Upload Endpoints
- **Visitor Photos:** `POST /upload/visitor-photo`
- **Complaint Attachments:** `POST /upload/complaint-attachment`
- **Lost Item Photos:** `POST /upload/lost-item-photo`
- **Profile Pictures:** `POST /upload/profile-picture`

### Upload Format
```http
POST /upload/visitor-photo
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [image file]
```

**Supported Formats:**
- Images: JPG, JPEG, PNG, GIF
- Documents: PDF, DOC, DOCX
- Max Size: 5MB per file

## ❌ Error Responses

### Authentication Errors
```json
{
  "success": false,
  "message": "Invalid token",
  "code": "AUTH_INVALID_TOKEN"
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Server Errors
```json
{
  "success": false,
  "message": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## 🔧 Rate Limiting

- **General API:** 100 requests per 15 minutes
- **Authentication:** 5 login attempts per 15 minutes
- **File Upload:** 10 uploads per 5 minutes

## 📝 Response Format

All API responses follow this standard format:

```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": {}, // Response data (on success)
  "errors": [], // Error details (on failure)
  "timestamp": "2025-07-04T14:30:00.000Z"
}
```

## 🔗 WebSocket Events

### Real-time Updates
- **New Visitor:** `visitor:new`
- **Visitor Check-in:** `visitor:checkin`
- **Visitor Check-out:** `visitor:checkout`
- **New Complaint:** `complaint:new`
- **Complaint Update:** `complaint:update`

Connect to: `ws://localhost:3001/ws` (Development)
