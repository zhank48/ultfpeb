-- ================================================================
-- ULT FPEB PRODUCTION DEPLOYMENT - COMPLETE DATABASE SCHEMA
-- ================================================================
-- 
-- Script SQL lengkap untuk inisialisasi database ULT FPEB
-- Berdasarkan analisis database dan requirement deployment
-- 
-- Features:
-- - Complete database schema (15 tables)
-- - Foreign key constraints
-- - Performance indexes
-- - Default data seeding
-- - Default users (run separately with hashed passwords)
-- 
-- Usage:
-- 1. Create database: CREATE DATABASE ult_fpeb_db;
-- 2. Run this script: SOURCE /path/to/this/file.sql;
-- 3. Run Node.js script for users: node scripts/production-deployment-init.js
-- 
-- ================================================================

USE ult_fpeb_db;

-- ==============================================
-- 1. CORE SYSTEM TABLES
-- ==============================================

-- Users table (Admin and Receptionist)
CREATE TABLE IF NOT EXISTS users (
    id            int unsigned auto_increment primary key,
    name          varchar(255)                                             not null,
    email         varchar(255)                                             not null,
    password      varchar(255)                                             not null comment 'Hashed password',
    role          enum ('Admin', 'Receptionist') default 'Receptionist'    not null,
    avatar_url    varchar(2048)                                            null,
    photo_url     varchar(2048)                                            null,
    phone         varchar(45)                                              null,
    study_program varchar(255)                                             null,
    cohort        varchar(45)                                              null,
    created_at    timestamp                      default CURRENT_TIMESTAMP not null,
    updated_at    timestamp                      default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint email unique (email)
);

-- Visitors table  
CREATE TABLE IF NOT EXISTS visitors (
    id               int unsigned auto_increment primary key,
    full_name        varchar(255)                         not null,
    phone_number     varchar(45)                          not null,
    email            varchar(255)                         null,
    id_number        varchar(100)                         null,
    address          text                                 null,
    institution      varchar(255)                         null,
    purpose          varchar(255)                         not null,
    person_to_meet   varchar(255)                         not null,
    location         varchar(255)                         not null,
    photo_url        varchar(2048)                        null,
    signature_url    varchar(2048)                        null,
    check_in_time    datetime                             not null,
    check_out_time   datetime                             null,
    input_by_user_id int unsigned                         not null,
    created_at       timestamp  default CURRENT_TIMESTAMP not null,
    updated_at       timestamp  default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    request_document tinyint(1) default 0                 not null comment 'Whether visitor requested a document',
    document_type    varchar(255)                         null comment 'Type of document requested',
    document_name    varchar(500)                         null comment 'Name/description of document requested',
    document_number  varchar(255)                         null comment 'Reference number for document',
    input_by_name    varchar(255)                         null comment 'Nama operator yang menginput visitor',
    input_by_role    varchar(100)                         null comment 'Role/jabatan operator yang menginput visitor'
);

-- ==============================================
-- 2. COMPLAINT MANAGEMENT TABLES  
-- ==============================================

-- Complaint categories
CREATE TABLE IF NOT EXISTS complaint_categories (
    id          int unsigned auto_increment primary key,
    name        varchar(100)                         not null,
    description text                                 null,
    color       varchar(7) default '#6c757d'         null,
    is_active   tinyint(1) default 1                 null,
    created_at  timestamp  default CURRENT_TIMESTAMP null,
    updated_at  timestamp  default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
);

-- Dynamic complaint fields
CREATE TABLE IF NOT EXISTS complaint_fields (
    id            int unsigned auto_increment primary key,
    field_name    varchar(100) not null,
    field_label   varchar(200) not null,
    field_type    enum ('text', 'textarea', 'select', 'radio', 'checkbox', 'email', 'phone', 'tel', 'number', 'date', 'file', 'location') not null,
    field_options json null,
    is_required   tinyint(1) default 0 null,
    field_order   int default 0 null,
    is_active     tinyint(1) default 1 null,
    created_at    timestamp default CURRENT_TIMESTAMP null,
    updated_at    timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
);

-- Main complaints table with corrected field names (complainant_* instead of visitor_*)
CREATE TABLE IF NOT EXISTS complaints (
    id                int unsigned auto_increment primary key,
    ticket_number     varchar(20) null,
    complainant_id    varchar(255) null,
    complainant_name  varchar(255) null,
    complainant_email varchar(255) null,
    complainant_phone varchar(255) null,
    category_id       int unsigned null,
    priority          enum ('low', 'medium', 'high', 'urgent') default 'medium' null,
    status            enum ('open', 'in_progress', 'resolved', 'closed') default 'open' null,
    subject           varchar(500) not null,
    description       text not null,
    form_data         json null,
    photo_urls        json null comment 'Array of photo URLs for complaint evidence',
    assigned_to       int unsigned null,
    resolved_at       timestamp null,
    created_at        timestamp default CURRENT_TIMESTAMP null,
    updated_at        timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint ticket_number unique (ticket_number)
);

-- Complaint responses
CREATE TABLE IF NOT EXISTS complaint_responses (
    id            int unsigned auto_increment primary key,
    complaint_id  int unsigned not null,
    user_id       int unsigned not null,
    response_text text not null,
    is_internal   tinyint(1) default 0 null,
    created_at    timestamp default CURRENT_TIMESTAMP null
);

-- ==============================================
-- 3. FEEDBACK SYSTEM TABLES
-- ==============================================

-- Feedback categories
CREATE TABLE IF NOT EXISTS feedback_categories (
    id          int auto_increment primary key,
    name        varchar(255) not null,
    description text null,
    is_active   tinyint(1) default 1 not null,
    sort_order  int default 0 not null,
    created_at  timestamp default CURRENT_TIMESTAMP not null,
    updated_at  timestamp default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    color       varchar(7) default '#6c757d' null
);

-- Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id                          int auto_increment primary key,
    category                    int null,
    visitor_id                  int null,
    visitor_name                varchar(255) not null,
    rating                      int not null,
    feedback_text               text null,
    created_at                  timestamp default CURRENT_TIMESTAMP null,
    updated_at                  timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    access_ease_rating          tinyint null comment 'Rating from 1 to 5',
    wait_time_rating            tinyint null comment 'Rating from 1 to 5',
    staff_friendliness_rating   tinyint null comment 'Rating from 1 to 5',
    info_clarity_rating         tinyint null comment 'Rating from 1 to 5',
    overall_satisfaction_rating tinyint null comment 'Rating from 1 to 5',
    willing_to_return           tinyint(1) null comment 'Whether visitor is willing to return',
    likes                       text null comment 'Visitor feedback text',
    suggestions                 text null comment 'Visitor feedback text',
    check ((rating >= 1) and (rating <= 5))
) collate = utf8mb4_unicode_ci;

-- ==============================================
-- 4. LOST ITEMS MANAGEMENT TABLES
-- ==============================================

-- Lost items
CREATE TABLE IF NOT EXISTS lost_items (
    id                      int auto_increment primary key,
    item_name               varchar(255) not null,
    description             text null,
    category                varchar(100) null,
    found_location          varchar(255) not null,
    found_date              date not null,
    found_time              time not null,
    finder_name             varchar(255) null,
    finder_contact          varchar(100) null,
    found_by                varchar(255) null,
    condition_status        enum ('excellent', 'good', 'fair', 'poor') default 'good' null,
    handover_photo_url      longtext null,
    handover_signature_data text null,
    status                  enum ('found', 'returned', 'disposed') default 'found' null,
    notes                   text null,
    input_by_user_id        int unsigned null,
    created_at              timestamp default CURRENT_TIMESTAMP null,
    updated_at              timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    received_by_operator    varchar(255) null,
    received_by_operator_id int unsigned null
);

-- Item returns
CREATE TABLE IF NOT EXISTS item_returns (
    id                    int auto_increment primary key,
    lost_item_id          int not null,
    claimer_name          varchar(255) not null,
    claimer_contact       varchar(100) not null,
    claimer_id_number     varchar(100) not null,
    relationship_to_owner enum ('owner', 'family', 'friend', 'colleague', 'representative') default 'owner' null,
    proof_of_ownership    text null,
    return_date           date not null,
    return_time           time not null,
    returned_by           varchar(255) null,
    returned_by_user_id   int unsigned null,
    notes                 text null,
    created_at            timestamp default CURRENT_TIMESTAMP null,
    return_operator       varchar(255) null,
    return_operator_id    int unsigned null,
    return_photo_url      longtext null,
    return_signature_data longtext null,
    returned_by_id        int unsigned null comment 'Foreign key reference to users table'
);

-- ==============================================
-- 5. CONFIGURATION MANAGEMENT TABLES
-- ==============================================

-- Configuration categories
CREATE TABLE IF NOT EXISTS configuration_categories (
    id           int auto_increment primary key,
    key_name     varchar(50) not null comment 'units, purposes, documentTypes',
    display_name varchar(100) not null comment 'Human readable name',
    description  text null comment 'Description of this configuration category',
    is_active    tinyint(1) default 1 null,
    created_at   timestamp default CURRENT_TIMESTAMP null,
    updated_at   timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint key_name unique (key_name)
);

-- Configuration groups
CREATE TABLE IF NOT EXISTS configuration_groups (
    id          int auto_increment primary key,
    category_id int not null,
    group_name  varchar(100) not null comment 'Group label like DEKANAT, Program Studi',
    sort_order  int default 0 null,
    is_active   tinyint(1) default 1 null,
    created_at  timestamp default CURRENT_TIMESTAMP null,
    updated_at  timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
);

-- Configuration options
CREATE TABLE IF NOT EXISTS configuration_options (
    id           int auto_increment primary key,
    category_id  int not null,
    group_id     int null comment 'NULL for flat lists like purposes, documentTypes',
    option_value varchar(255) not null,
    display_text varchar(255) not null,
    sort_order   int default 0 null,
    is_active    tinyint(1) default 1 null,
    created_at   timestamp default CURRENT_TIMESTAMP null,
    updated_at   timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
);

-- ==============================================
-- 6. MENU SYSTEM TABLES
-- ==============================================

-- Menu configuration
CREATE TABLE IF NOT EXISTS menu_config (
    id                int unsigned auto_increment primary key,
    show_logos        tinyint(1) default 1 not null,
    show_icons        tinyint(1) default 1 not null,
    collapse_behavior enum ('click', 'hover', 'none') default 'hover' not null,
    theme_mode        enum ('light', 'dark', 'auto') default 'auto' not null,
    updated_at        timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) collate = utf8mb4_unicode_ci;

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
    id          int unsigned auto_increment primary key,
    name        varchar(100) not null,
    href        varchar(255) not null,
    icon        varchar(50) not null,
    roles       json default (json_array(_utf8mb4'Admin', _utf8mb4'Receptionist')) not null,
    parent_id   int unsigned null,
    sort_order  int default 0 not null,
    is_active   tinyint(1) default 1 not null,
    is_external tinyint(1) default 0 not null,
    description text null,
    created_at  timestamp default CURRENT_TIMESTAMP null,
    updated_at  timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) collate = utf8mb4_unicode_ci;

-- ==============================================
-- FOREIGN KEY CONSTRAINTS
-- ==============================================

-- Visitors foreign keys
ALTER TABLE visitors ADD CONSTRAINT fk_visitors_users 
    FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON UPDATE CASCADE;

-- Complaints foreign keys
ALTER TABLE complaints ADD CONSTRAINT fk_complaints_category 
    FOREIGN KEY (category_id) REFERENCES complaint_categories(id) ON DELETE SET NULL;

ALTER TABLE complaints ADD CONSTRAINT fk_complaints_assigned_to 
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Complaint responses foreign keys
ALTER TABLE complaint_responses ADD CONSTRAINT fk_complaint_responses_complaint 
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE;

ALTER TABLE complaint_responses ADD CONSTRAINT fk_complaint_responses_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Feedbacks foreign keys
ALTER TABLE feedbacks ADD CONSTRAINT fk_feedback_category 
    FOREIGN KEY (category) REFERENCES feedback_categories(id) ON DELETE SET NULL;

-- Lost items foreign keys
ALTER TABLE lost_items ADD CONSTRAINT fk_lost_items_user 
    FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Item returns foreign keys  
ALTER TABLE item_returns ADD CONSTRAINT fk_item_returns_lost_item 
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE;

ALTER TABLE item_returns ADD CONSTRAINT fk_item_returns_user 
    FOREIGN KEY (returned_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- Configuration foreign keys
ALTER TABLE configuration_groups ADD CONSTRAINT fk_config_groups_category 
    FOREIGN KEY (category_id) REFERENCES configuration_categories(id) ON DELETE CASCADE;

ALTER TABLE configuration_options ADD CONSTRAINT fk_config_options_category 
    FOREIGN KEY (category_id) REFERENCES configuration_categories(id) ON DELETE CASCADE;

ALTER TABLE configuration_options ADD CONSTRAINT fk_config_options_group 
    FOREIGN KEY (group_id) REFERENCES configuration_groups(id) ON DELETE CASCADE;

-- Menu foreign keys
ALTER TABLE menu_items ADD CONSTRAINT fk_menu_items_parent 
    FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE SET NULL;

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Visitors indexes
CREATE INDEX idx_visitors_check_in_time ON visitors(check_in_time);
CREATE INDEX idx_visitors_full_name ON visitors(full_name);
CREATE INDEX idx_visitors_location ON visitors(location);
CREATE INDEX idx_visitors_document_type ON visitors(document_type);
CREATE INDEX idx_visitors_request_document ON visitors(request_document);
CREATE INDEX fk_visitors_users_idx ON visitors(input_by_user_id);

-- Complaints indexes
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);
CREATE INDEX idx_complaints_created_at ON complaints(created_at);
CREATE INDEX idx_complaints_category_id ON complaints(category_id);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);

-- Feedbacks indexes
CREATE INDEX idx_feedbacks_rating ON feedbacks(rating);
CREATE INDEX idx_feedbacks_visitor_id ON feedbacks(visitor_id);
CREATE INDEX fk_feedbacks_category_idx ON feedbacks(category);
CREATE INDEX idx_feedback_categories_active ON feedback_categories(is_active);
CREATE INDEX idx_feedback_categories_sort_order ON feedback_categories(sort_order);

-- Lost items indexes
CREATE INDEX idx_lost_items_status ON lost_items(status);
CREATE INDEX idx_lost_items_found_date ON lost_items(found_date);
CREATE INDEX idx_lost_items_category ON lost_items(category);

-- Configuration indexes
CREATE INDEX idx_config_categories_key_name ON configuration_categories(key_name);
CREATE INDEX idx_config_groups_category_sort ON configuration_groups(category_id, sort_order);
CREATE INDEX idx_config_options_category_group_sort ON configuration_options(category_id, group_id, sort_order);
CREATE INDEX idx_config_options_active ON configuration_options(is_active);
CREATE INDEX idx_config_options_group_id ON configuration_options(group_id);

-- Menu indexes
CREATE INDEX idx_menu_items_is_active ON menu_items(is_active);
CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_id);
CREATE INDEX idx_menu_items_sort_order ON menu_items(sort_order);

-- ==============================================
-- DEFAULT DATA SEEDING
-- ==============================================

-- Insert default complaint categories
INSERT IGNORE INTO complaint_categories (name, description, color, is_active) VALUES
('Layanan Umum', 'Keluhan terkait layanan umum fakultas', '#007bff', 1),
('Fasilitas', 'Keluhan terkait fasilitas dan infrastruktur', '#28a745', 1),
('Administrasi', 'Keluhan terkait proses administrasi', '#ffc107', 1),
('Akademik', 'Keluhan terkait layanan akademik', '#17a2b8', 1),
('Lainnya', 'Keluhan lain yang tidak termasuk kategori di atas', '#6c757d', 1);

-- Insert default feedback categories
INSERT IGNORE INTO feedback_categories (name, description, color, is_active, sort_order) VALUES
('Layanan', 'Feedback tentang kualitas layanan', '#007bff', 1, 1),
('Fasilitas', 'Feedback tentang fasilitas yang tersedia', '#28a745', 1, 2),
('Proses', 'Feedback tentang proses pelayanan', '#ffc107', 1, 3),
('Kepuasan Keseluruhan', 'Feedback kepuasan secara keseluruhan', '#17a2b8', 1, 4),
('Saran', 'Saran untuk perbaikan', '#6c757d', 1, 5);

-- Insert default configuration categories
INSERT IGNORE INTO configuration_categories (key_name, display_name, description, is_active) VALUES
('units', 'Unit/Bagian', 'Daftar unit atau bagian di FPEB UPI', 1),
('purposes', 'Tujuan Kunjungan', 'Daftar tujuan kunjungan pengunjung', 1),
('documentTypes', 'Jenis Dokumen', 'Jenis dokumen yang dapat diminta pengunjung', 1),
('locations', 'Lokasi', 'Daftar lokasi di lingkungan FPEB UPI', 1);

-- Insert default configuration groups for units
INSERT IGNORE INTO configuration_groups (category_id, group_name, sort_order, is_active) VALUES
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 'DEKANAT', 1, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 'Program Studi', 2, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 'Unit Penunjang', 3, 1);

-- Insert default configuration options
INSERT IGNORE INTO configuration_options (category_id, group_id, option_value, display_text, sort_order, is_active) VALUES
-- DEKANAT
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'DEKANAT'), 'dekan', 'Dekan', 1, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'DEKANAT'), 'wd1', 'Wakil Dekan 1', 2, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'DEKANAT'), 'wd2', 'Wakil Dekan 2', 3, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'DEKANAT'), 'wd3', 'Wakil Dekan 3', 4, 1),

-- Program Studi
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'Program Studi'), 'akuntansi', 'Pendidikan Akuntansi', 1, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'Program Studi'), 'manajemen', 'Pendidikan Manajemen', 2, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'Program Studi'), 'ekonomi', 'Pendidikan Ekonomi', 3, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'units'), 
 (SELECT id FROM configuration_groups WHERE group_name = 'Program Studi'), 'manper', 'Manajemen Perkantoran', 4, 1);

-- Tujuan kunjungan (flat list)
INSERT IGNORE INTO configuration_options (category_id, group_id, option_value, display_text, sort_order, is_active) VALUES
((SELECT id FROM configuration_categories WHERE key_name = 'purposes'), NULL, 'konsultasi', 'Konsultasi', 1, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'purposes'), NULL, 'pengambilan_dokumen', 'Pengambilan Dokumen', 2, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'purposes'), NULL, 'penyerahan_dokumen', 'Penyerahan Dokumen', 3, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'purposes'), NULL, 'rapat', 'Rapat/Pertemuan', 4, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'purposes'), NULL, 'penelitian', 'Penelitian', 5, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'purposes'), NULL, 'kunjungan_kerja', 'Kunjungan Kerja', 6, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'purposes'), NULL, 'lainnya', 'Lainnya', 7, 1);

-- Jenis dokumen (flat list)
INSERT IGNORE INTO configuration_options (category_id, group_id, option_value, display_text, sort_order, is_active) VALUES
((SELECT id FROM configuration_categories WHERE key_name = 'documentTypes'), NULL, 'surat_keterangan', 'Surat Keterangan', 1, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'documentTypes'), NULL, 'transkrip', 'Transkrip Nilai', 2, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'documentTypes'), NULL, 'ijazah', 'Ijazah', 3, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'documentTypes'), NULL, 'sertifikat', 'Sertifikat', 4, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'documentTypes'), NULL, 'surat_rekomendasi', 'Surat Rekomendasi', 5, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'documentTypes'), NULL, 'berkas_administrasi', 'Berkas Administrasi', 6, 1);

-- Lokasi (flat list)
INSERT IGNORE INTO configuration_options (category_id, group_id, option_value, display_text, sort_order, is_active) VALUES
((SELECT id FROM configuration_categories WHERE key_name = 'locations'), NULL, 'ruang_dekan', 'Ruang Dekan', 1, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'locations'), NULL, 'ruang_wd', 'Ruang Wakil Dekan', 2, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'locations'), NULL, 'ruang_tata_usaha', 'Ruang Tata Usaha', 3, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'locations'), NULL, 'ruang_dosen', 'Ruang Dosen', 4, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'locations'), NULL, 'ruang_kuliah', 'Ruang Kuliah', 5, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'locations'), NULL, 'laboratorium', 'Laboratorium', 6, 1),
((SELECT id FROM configuration_categories WHERE key_name = 'locations'), NULL, 'perpustakaan', 'Perpustakaan', 7, 1);

-- Insert default menu configuration
INSERT IGNORE INTO menu_config (show_logos, show_icons, collapse_behavior, theme_mode) VALUES
(1, 1, 'hover', 'auto');

-- Insert default menu items
INSERT IGNORE INTO menu_items (name, href, icon, roles, parent_id, sort_order, is_active, is_external, description) VALUES
('Dashboard', '/dashboard', 'dashboard', JSON_ARRAY('Admin', 'Receptionist'), NULL, 1, 1, 0, 'Dashboard utama sistem'),
('Visitor Management', '/visitors', 'people', JSON_ARRAY('Admin', 'Receptionist'), NULL, 2, 1, 0, 'Manajemen pengunjung'),
('Complaint Management', '/complaints', 'report_problem', JSON_ARRAY('Admin', 'Receptionist'), NULL, 3, 1, 0, 'Manajemen keluhan'),
('Feedback Management', '/feedback', 'feedback', JSON_ARRAY('Admin', 'Receptionist'), NULL, 4, 1, 0, 'Manajemen feedback'),
('Lost Items', '/lost-items', 'inventory', JSON_ARRAY('Admin', 'Receptionist'), NULL, 5, 1, 0, 'Manajemen barang hilang'),
('User Management', '/users', 'group', JSON_ARRAY('Admin'), NULL, 6, 1, 0, 'Manajemen pengguna'),
('Configuration', '/config', 'settings', JSON_ARRAY('Admin'), NULL, 7, 1, 0, 'Konfigurasi sistem');

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

SELECT 'Database schema initialization completed successfully!' as message;
SELECT 'Run Node.js script for creating default users with hashed passwords.' as next_step;

-- Note: Default users must be created using Node.js script with bcrypt:
-- - adminult@fpeb.upi.edu (password: admin) - Role: Admin
-- - arsip@fpeb.upi.edu (password: admin) - Role: Admin  
-- - manper@upi.edu (password: manper123) - Role: Receptionist
