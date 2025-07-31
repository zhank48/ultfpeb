# 🧪 MANUAL TESTING GUIDE - Workflow Visitor Edit/Delete

## 📋 Pre-Testing Checklist

### 1. Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 2. Verify Database
- ✅ MySQL server running
- ✅ Database `ult_fpeb_dev` exists
- ✅ Tables `visitors` & `visitor_actions` exist
- ✅ Test data visitors available

### 3. User Accounts
- ✅ Operator account (role: 'operator' atau 'resepsionis')
- ✅ Admin account (role: 'admin' atau 'Admin')

---

## 🎯 Test Scenario 1: Operator Edit Visitor

### Steps:
1. **Login sebagai Operator**
   - Buka http://localhost:5173
   - Login dengan credentials operator
   - Verify: Berhasil login dan redirect ke dashboard

2. **Navigate ke Visitors Page**
   - Click menu "Buku Tamu" → "Pengunjung" 
   - URL: `/app/visitors`
   - Verify: List visitors muncul, tidak ada yang soft-deleted

3. **Open Manage Modal**
   - Pilih visitor aktif dari list
   - Click dropdown actions (⋮) di kolom "Actions"
   - Click "Manage Data"
   - Verify: Modal popup "Kelola Data Visitor" muncul

4. **Select Edit Action**
   - Dalam modal, click card "Edit Data Visitor"
   - Verify: Form edit muncul dengan data visitor ter-isi

5. **Fill Edit Form**
   - Edit beberapa field (nama, phone, email, etc.)
   - Isi field "Alasan Edit" (required)
   - Verify: Form validation bekerja

6. **Submit Edit**
   - Click "Kirim Permintaan Edit" button
   - Verify: Success message muncul
   - Verify: Modal tertutup
   - Verify: Data visitor terupdate di list

### Expected Results:
- ✅ Edit berhasil disubmit
- ✅ Data visitor langsung terupdate
- ✅ Action logged di `visitor_actions` table
- ✅ Status action: 'completed' (untuk admin) atau 'pending' (untuk operator)

---

## 🗑️ Test Scenario 2: Operator Request Delete

### Steps:
1. **Login sebagai Operator** (jika belum)

2. **Select Delete Action**
   - Pilih visitor lain dari list
   - Click dropdown actions (⋮)
   - Click "Manage Data"
   - Click card "Hapus Data Visitor"
   - Verify: Form delete muncul dengan preview data

3. **Fill Delete Reason**
   - Isi "Alasan Penghapusan" (required)
   - Contoh: "Data duplikat, sudah ada entry yang sama"
   - Verify: Button "Kirim Permintaan Hapus" enable

4. **Submit Delete Request**
   - Click "Kirim Permintaan Hapus"
   - Verify: Success message muncul
   - Verify: Modal tertutup
   - Verify: Visitor masih muncul di list (belum dihapus)

5. **Check Admin Review Option**
   - Verify: Popup atau notification untuk redirect ke admin page
   - Choose: "Ya, Buka Halaman Admin" atau "Nanti Saja"

### Expected Results:
- ✅ Delete request berhasil disubmit
- ✅ Visitor masih terlihat di /visitors
- ✅ Request logged di `visitor_actions` dengan status 'pending'
- ✅ Option untuk redirect ke admin review page

---

## 👨‍💼 Test Scenario 3: Admin Review & Approve Delete

### Steps:
1. **Login sebagai Admin**
   - Logout dari operator account
   - Login dengan credentials admin
   - Verify: Menu "Pengaturan" → "Manajemen Pengunjung" tersedia

2. **Navigate to Admin Review**
   - Click "Pengaturan" → "Manajemen Pengunjung"
   - URL: `/app/visitor-management`
   - Verify: Halaman admin management muncul

3. **View Pending Requests**
   - Click tab "Permintaan Aksi"
   - Verify: List pending delete requests muncul
   - Verify: Request dari scenario 2 terlihat

4. **Review Request Details**
   - Click "Lihat Detail" pada pending request
   - Verify: Modal dengan detail request muncul
   - Verify: Original data visitor, reason, timestamp terlihat

5. **Approve Delete Request**
   - Click "Setujui" button
   - Isi "Catatan Admin" (opsional)
   - Click confirm
   - Verify: Success message muncul

6. **Verify Soft Delete**
   - Kembali ke tab "Semua Visitor"
   - Verify: Visitor yang di-approve tidak muncul di active list
   - Navigate ke `/app/visitors`
   - Verify: Visitor hilang dari main visitors page

### Expected Results:
- ✅ Delete request berhasil di-approve
- ✅ Visitor di-soft delete (`deleted_at` filled)
- ✅ Action status update ke 'approved'
- ✅ Visitor hilang dari /visitors tapi masih di /visitor-management

---

## ❌ Test Scenario 4: Admin Reject Delete

### Steps:
1. **Create Another Delete Request** (sebagai operator)
   - Login sebagai operator
   - Submit delete request untuk visitor lain

2. **Login sebagai Admin** (jika belum)

3. **Navigate to Pending Requests**
   - `/app/visitor-management` → tab "Permintaan Aksi"

4. **Reject Request**
   - Click "Tolak" pada pending request
   - Isi "Alasan Penolakan" (required)
   - Contoh: "Data visitor masih diperlukan untuk audit"
   - Click confirm

5. **Verify Rejection**
   - Verify: Success message muncul
   - Verify: Request status berubah ke 'rejected'
   - Navigate ke `/app/visitors`
   - Verify: Visitor tetap muncul di main list

### Expected Results:
- ✅ Delete request berhasil di-reject
- ✅ Visitor tetap aktif (tidak dihapus)
- ✅ Action status update ke 'rejected'
- ✅ Visitor tetap muncul di /visitors

---

## 🔄 Test Scenario 5: Admin Direct Edit/Delete

### Steps:
1. **Login sebagai Admin**

2. **Test Direct Edit**
   - Navigate ke `/app/visitors`
   - Pilih visitor, click "Manage Data"
   - Pilih "Edit Data"
   - Edit data dan submit
   - Verify: Data langsung terupdate tanpa approval

3. **Test Direct Delete**
   - Pilih visitor lain, click "Manage Data"
   - Pilih "Hapus Data"
   - Isi alasan dan submit
   - Verify: Visitor langsung di-soft delete

### Expected Results:
- ✅ Admin dapat edit/delete langsung
- ✅ Tidak perlu approval process
- ✅ Actions tetap di-log untuk audit trail

---

## 📊 Verification Checklist

### Database Verification
```sql
-- Check visitor actions
SELECT * FROM visitor_actions ORDER BY created_at DESC LIMIT 10;

-- Check soft-deleted visitors
SELECT id, full_name, deleted_at, deleted_by FROM visitors WHERE deleted_at IS NOT NULL;

-- Check active visitors
SELECT COUNT(*) as active_count FROM visitors WHERE deleted_at IS NULL;
```

### Frontend Verification
- ✅ Modal responsive di berbagai screen size
- ✅ Form validation bekerja untuk required fields
- ✅ Loading states muncul saat submit
- ✅ Success/error notifications muncul
- ✅ Navigation dan routing bekerja
- ✅ Role-based access control (admin vs operator)

### Workflow Verification
- ✅ Setiap step di mermaid diagram terpenuhi
- ✅ Data flow dari frontend ke backend benar
- ✅ Status transitions (pending → approved/rejected) bekerja
- ✅ Soft delete mechanism berfungsi
- ✅ Audit trail lengkap tersimpan

---

## 🐛 Common Issues & Solutions

### Issue 1: Modal tidak muncul
**Solution:** Check browser console untuk JavaScript errors

### Issue 2: API calls gagal  
**Solution:** Verify backend server running & check network tab

### Issue 3: Data tidak terupdate
**Solution:** Check database connection & query logs

### Issue 4: Role permission error
**Solution:** Verify user role di JWT token & database

### Issue 5: Soft delete tidak bekerja
**Solution:** Check `deleted_at` column exists & populate correctly

---

## ✅ Success Criteria

Workflow dianggap berhasil jika:
- ✅ Semua 5 test scenarios PASS
- ✅ Database verification shows correct data
- ✅ Frontend UI responsive dan user-friendly
- ✅ No console errors or API failures
- ✅ Role-based access control working
- ✅ Audit trail complete dan accurate

---

**🎯 Target:** 100% test scenarios PASS  
**📅 Timeline:** Manual testing dapat diselesaikan dalam 30-45 menit  
**👥 Tester:** Minimum 2 users (1 operator + 1 admin) untuk complete testing
