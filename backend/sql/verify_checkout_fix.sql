-- =====================================================
-- VERIFY CHECKOUT FIX - DATABASE VERIFICATION SCRIPT
-- Script untuk verifikasi bahwa semua perbaikan sudah berhasil
-- =====================================================

SELECT '🔍 VERIFYING CHECKOUT ERROR FIX...' AS verification_start;
SELECT '========================================' AS separator;

-- =====================================================
-- 1. CHECK VISITORS TABLE CHECKOUT COLUMNS
-- =====================================================

SELECT '📋 CHECKING VISITORS TABLE CHECKOUT COLUMNS...' AS step1;

-- Check if all required checkout columns exist
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    CASE 
        WHEN COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email') 
        THEN '✅ REQUIRED' 
        ELSE '📝 INFO' 
    END as status,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'visitors' 
  AND COLUMN_NAME LIKE '%checkout%'
ORDER BY ORDINAL_POSITION;

-- Count required checkout columns
SELECT 
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ SUCCESS: All 5 required checkout columns exist'
        WHEN COUNT(*) > 0 THEN CONCAT('⚠️  PARTIAL: Only ', COUNT(*), ' out of 5 required checkout columns exist')
        ELSE '❌ ERROR: No checkout columns found'
    END as checkout_columns_summary
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'visitors' 
  AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email');

-- =====================================================
-- 2. CHECK VISITOR_EDIT_HISTORY TABLE
-- =====================================================

SELECT '📋 CHECKING VISITOR_EDIT_HISTORY TABLE...' AS step2;

-- Check if visitor_edit_history table exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS: visitor_edit_history table exists'
        ELSE '❌ ERROR: visitor_edit_history table does not exist'
    END as edit_history_table_status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'visitor_edit_history';

-- Show visitor_edit_history table structure if it exists
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'visitor_edit_history'
ORDER BY ORDINAL_POSITION;

-- =====================================================
-- 3. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT '📋 CHECKING FOREIGN KEY CONSTRAINTS...' AS step3;

-- Check foreign key constraints related to checkout
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME,
    '✅ FK EXISTS' as status
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
  AND (COLUMN_NAME LIKE '%checkout%' OR TABLE_NAME = 'visitor_edit_history')
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- =====================================================
-- 4. TEST CHECKOUT FUNCTIONALITY WITH SAMPLE DATA
-- =====================================================

SELECT '📋 TESTING CHECKOUT FUNCTIONALITY...' AS step4;

-- Check if there are any visitors to test with
SELECT 
    COUNT(*) as total_visitors,
    COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as checked_out_visitors,
    COUNT(CASE WHEN check_out_time IS NULL THEN 1 END) as active_visitors
FROM visitors;

-- Show sample of visitors with checkout info
SELECT 
    id,
    full_name,
    check_in_time,
    check_out_time,
    checkout_by_name,
    checkout_by_role,
    checkout_by_user_id,
    CASE 
        WHEN check_out_time IS NOT NULL AND checkout_by_role IS NOT NULL THEN '✅ COMPLETE'
        WHEN check_out_time IS NOT NULL AND checkout_by_role IS NULL THEN '⚠️  MISSING DATA'
        ELSE '📝 ACTIVE'
    END as checkout_status
FROM visitors 
ORDER BY id DESC 
LIMIT 5;

-- =====================================================
-- 5. CHECK USERS TABLE FOR CHECKOUT OPERATOR INFO
-- =====================================================

SELECT '📋 CHECKING USERS TABLE FOR CHECKOUT OPERATORS...' AS step5;

-- Check if users table has required fields for checkout operator info
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CASE 
        WHEN COLUMN_NAME IN ('avatar_url', 'photo_url') THEN '✅ CHECKOUT FIELD' 
        WHEN COLUMN_NAME IN ('name', 'role', 'email') THEN '✅ REQUIRED FIELD'
        ELSE '📝 OTHER FIELD' 
    END as field_type
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME IN ('name', 'role', 'email', 'avatar_url', 'photo_url')
ORDER BY ORDINAL_POSITION;

-- Show users that can act as checkout operators
SELECT 
    id,
    name,
    role,
    email,
    CASE 
        WHEN avatar_url IS NOT NULL THEN '✅ HAS AVATAR'
        WHEN photo_url IS NOT NULL THEN '✅ HAS PHOTO'
        ELSE '📝 NO AVATAR'
    END as avatar_status
FROM users 
WHERE role IN ('Admin', 'Receptionist')
LIMIT 5;

-- =====================================================
-- 6. FINAL VERIFICATION SUMMARY
-- =====================================================

SELECT '📋 FINAL VERIFICATION SUMMARY...' AS step6;

-- Overall system health check
SELECT 
    'CHECKOUT COLUMNS' as component,
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'visitors' 
                AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email')) = 5 
        THEN '✅ HEALTHY' 
        ELSE '❌ NEEDS FIX' 
    END as status

UNION ALL

SELECT 
    'EDIT HISTORY TABLE' as component,
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'visitor_edit_history') > 0 
        THEN '✅ HEALTHY' 
        ELSE '❌ NEEDS FIX' 
    END as status

UNION ALL

SELECT 
    'USER FIELDS' as component,
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'users' 
                AND COLUMN_NAME IN ('name', 'role', 'email')) = 3 
        THEN '✅ HEALTHY' 
        ELSE '❌ NEEDS FIX' 
    END as status;

-- Final status message
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'visitors' 
                AND COLUMN_NAME = 'checkout_by_role') > 0
        THEN '🎉 SUCCESS: Checkout error 500 fix is COMPLETE! You can now restart your application.'
        ELSE '❌ FAILED: Checkout error 500 fix is INCOMPLETE. Please run the fix script again.'
    END as final_verification_result;

SELECT '========================================' AS separator;
SELECT '✅ VERIFICATION COMPLETED' AS verification_end;