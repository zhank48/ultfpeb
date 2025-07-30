-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for ult_fpeb_dev
CREATE DATABASE IF NOT EXISTS `ult_fpeb_dev` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `ult_fpeb_dev`;

-- Dumping structure for table ult_fpeb_dev.complaints
CREATE TABLE IF NOT EXISTS `complaints` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(20) DEFAULT NULL,
  `complainant_id` varchar(255) DEFAULT NULL,
  `complainant_name` varchar(255) DEFAULT NULL,
  `complainant_email` varchar(255) DEFAULT NULL,
  `complainant_phone` varchar(255) DEFAULT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
  `subject` varchar(500) NOT NULL,
  `description` text NOT NULL,
  `form_data` json DEFAULT NULL,
  `photo_urls` json DEFAULT NULL COMMENT 'Array of photo URLs for complaint evidence',
  `assigned_to` int unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `idx_complaints_status` (`status`),
  KEY `idx_complaints_priority` (`priority`),
  KEY `idx_complaints_created_at` (`created_at`),
  KEY `idx_complaints_category_id` (`category_id`),
  KEY `idx_complaints_assigned_to` (`assigned_to`),
  CONSTRAINT `fk_complaints_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_complaints_category` FOREIGN KEY (`category_id`) REFERENCES `complaint_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.complaint_categories
CREATE TABLE IF NOT EXISTS `complaint_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `color` varchar(7) DEFAULT '#6c757d',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.complaint_fields
CREATE TABLE IF NOT EXISTS `complaint_fields` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `field_name` varchar(100) NOT NULL,
  `field_label` varchar(200) NOT NULL,
  `field_type` enum('text','textarea','select','radio','checkbox','email','phone','tel','number','date','file','location') NOT NULL,
  `field_options` json DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT '0',
  `field_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.complaint_responses
CREATE TABLE IF NOT EXISTS `complaint_responses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `complaint_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `response_text` text NOT NULL,
  `is_internal` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_complaint_responses_complaint` (`complaint_id`),
  KEY `fk_complaint_responses_user` (`user_id`),
  CONSTRAINT `fk_complaint_responses_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_complaint_responses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.configuration_categories
CREATE TABLE IF NOT EXISTS `configuration_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key_name` varchar(50) NOT NULL COMMENT 'units, purposes, documentTypes',
  `display_name` varchar(100) NOT NULL COMMENT 'Human readable name',
  `description` text COMMENT 'Description of this configuration category',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`),
  KEY `idx_config_categories_key_name` (`key_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.configuration_groups
CREATE TABLE IF NOT EXISTS `configuration_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `group_name` varchar(100) NOT NULL COMMENT 'Group label like DEKANAT, Program Studi',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_config_groups_category_sort` (`category_id`,`sort_order`),
  CONSTRAINT `fk_config_groups_category` FOREIGN KEY (`category_id`) REFERENCES `configuration_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.configuration_options
CREATE TABLE IF NOT EXISTS `configuration_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `group_id` int DEFAULT NULL COMMENT 'NULL for flat lists like purposes, documentTypes',
  `option_value` varchar(255) NOT NULL,
  `display_text` varchar(255) NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_config_options_category_group_sort` (`category_id`,`group_id`,`sort_order`),
  KEY `idx_config_options_active` (`is_active`),
  KEY `idx_config_options_group_id` (`group_id`),
  CONSTRAINT `fk_config_options_category` FOREIGN KEY (`category_id`) REFERENCES `configuration_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_config_options_group` FOREIGN KEY (`group_id`) REFERENCES `configuration_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.deletion_audit_logs
CREATE TABLE IF NOT EXISTS `deletion_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visitor_id` int NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `performed_by` int NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visitor_id` (`visitor_id`),
  KEY `idx_performed_by` (`performed_by`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.deletion_requests
CREATE TABLE IF NOT EXISTS `deletion_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `visitor_id` int unsigned NOT NULL,
  `requested_by` int unsigned NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approved_by` int unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text,
  PRIMARY KEY (`id`),
  KEY `idx_visitor_id` (`visitor_id`),
  KEY `idx_requested_by` (`requested_by`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_approved_by` (`approved_by`),
  CONSTRAINT `fk_deletion_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deletion_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deletion_requests_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `visitors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.feedbacks
CREATE TABLE IF NOT EXISTS `feedbacks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` int DEFAULT NULL,
  `visitor_id` int DEFAULT NULL,
  `visitor_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int NOT NULL,
  `feedback_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `access_ease_rating` tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
  `wait_time_rating` tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
  `staff_friendliness_rating` tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
  `info_clarity_rating` tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
  `overall_satisfaction_rating` tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
  `willing_to_return` tinyint(1) DEFAULT NULL COMMENT 'Whether visitor is willing to return',
  `likes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Visitor feedback text',
  `suggestions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Visitor feedback text',
  PRIMARY KEY (`id`),
  KEY `idx_feedbacks_rating` (`rating`),
  KEY `idx_feedbacks_visitor_id` (`visitor_id`),
  KEY `fk_feedbacks_category_idx` (`category`),
  CONSTRAINT `fk_feedback_category` FOREIGN KEY (`category`) REFERENCES `feedback_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `feedbacks_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.feedback_categories
CREATE TABLE IF NOT EXISTS `feedback_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `color` varchar(7) DEFAULT '#6c757d',
  PRIMARY KEY (`id`),
  KEY `idx_feedback_categories_active` (`is_active`),
  KEY `idx_feedback_categories_sort_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.item_returns
CREATE TABLE IF NOT EXISTS `item_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lost_item_id` int NOT NULL,
  `claimer_name` varchar(255) NOT NULL,
  `claimer_contact` varchar(100) NOT NULL,
  `claimer_id_number` varchar(100) NOT NULL,
  `relationship_to_owner` enum('owner','family','friend','colleague','representative') DEFAULT 'owner',
  `proof_of_ownership` text,
  `return_date` date NOT NULL,
  `return_time` time NOT NULL,
  `returned_by` varchar(255) DEFAULT NULL,
  `returned_by_user_id` int unsigned DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `return_operator` varchar(255) DEFAULT NULL,
  `return_operator_id` int unsigned DEFAULT NULL,
  `return_photo_url` longtext,
  `return_signature_data` longtext,
  `returned_by_id` int unsigned DEFAULT NULL COMMENT 'Foreign key reference to users table',
  PRIMARY KEY (`id`),
  KEY `fk_item_returns_lost_item` (`lost_item_id`),
  KEY `fk_item_returns_user` (`returned_by_id`),
  CONSTRAINT `fk_item_returns_lost_item` FOREIGN KEY (`lost_item_id`) REFERENCES `lost_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_returns_user` FOREIGN KEY (`returned_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.lost_items
CREATE TABLE IF NOT EXISTS `lost_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `found_location` varchar(255) NOT NULL,
  `found_date` date NOT NULL,
  `found_time` time NOT NULL,
  `finder_name` varchar(255) DEFAULT NULL,
  `finder_contact` varchar(100) DEFAULT NULL,
  `found_by` varchar(255) DEFAULT NULL,
  `condition_status` enum('excellent','good','fair','poor') DEFAULT 'good',
  `handover_photo_url` longtext,
  `handover_signature_data` longtext,
  `status` enum('found','returned','disposed') DEFAULT 'found',
  `notes` text,
  `input_by_user_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `received_by_operator` varchar(255) DEFAULT NULL,
  `received_by_operator_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_lost_items_user` (`input_by_user_id`),
  KEY `idx_lost_items_status` (`status`),
  KEY `idx_lost_items_found_date` (`found_date`),
  KEY `idx_lost_items_category` (`category`),
  CONSTRAINT `fk_lost_items_user` FOREIGN KEY (`input_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.menu_config
CREATE TABLE IF NOT EXISTS `menu_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `show_logos` tinyint(1) NOT NULL DEFAULT '1',
  `show_icons` tinyint(1) NOT NULL DEFAULT '1',
  `collapse_behavior` enum('click','hover','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hover',
  `theme_mode` enum('light','dark','auto') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.menu_items
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `href` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `roles` json NOT NULL DEFAULT (json_array(_utf8mb4'Admin',_utf8mb4'Receptionist')),
  `parent_id` int unsigned DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_external` tinyint(1) NOT NULL DEFAULT '0',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_menu_items_is_active` (`is_active`),
  KEY `idx_menu_items_parent_id` (`parent_id`),
  KEY `idx_menu_items_sort_order` (`sort_order`),
  CONSTRAINT `fk_menu_items_parent` FOREIGN KEY (`parent_id`) REFERENCES `menu_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL COMMENT 'Hashed password',
  `role` enum('Admin','Manager','Receptionist','Operator','Staff') NOT NULL DEFAULT 'Receptionist',
  `avatar_url` varchar(2048) DEFAULT NULL,
  `photo_url` varchar(2048) DEFAULT NULL,
  `phone` varchar(45) DEFAULT NULL,
  `study_program` varchar(255) DEFAULT NULL,
  `cohort` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.visitors
CREATE TABLE IF NOT EXISTS `visitors` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `phone_number` varchar(45) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `id_number` varchar(100) DEFAULT NULL,
  `address` text,
  `institution` varchar(255) DEFAULT NULL,
  `purpose` varchar(255) NOT NULL,
  `person_to_meet` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `photo_url` varchar(2048) DEFAULT NULL,
  `signature_url` varchar(2048) DEFAULT NULL,
  `check_in_time` datetime NOT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `input_by_user_id` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `request_document` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether visitor requested a document',
  `document_type` varchar(255) DEFAULT NULL COMMENT 'Type of document requested',
  `document_name` varchar(500) DEFAULT NULL COMMENT 'Name/description of document requested',
  `document_number` varchar(255) DEFAULT NULL COMMENT 'Reference number for document',
  `input_by_name` varchar(255) DEFAULT NULL COMMENT 'Nama operator yang menginput visitor',
  `input_by_role` varchar(100) DEFAULT NULL COMMENT 'Role/jabatan operator yang menginput visitor',
  `checkout_by_user_id` int unsigned DEFAULT NULL COMMENT 'ID of user who performed checkout',
  `checkout_by_name` varchar(255) DEFAULT NULL COMMENT 'Name of operator who performed checkout',
  `checkout_by_role` varchar(100) DEFAULT NULL COMMENT 'Role of operator who performed checkout',
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_visitors_check_in_time` (`check_in_time`),
  KEY `idx_visitors_full_name` (`full_name`),
  KEY `idx_visitors_location` (`location`),
  KEY `idx_visitors_document_type` (`document_type`),
  KEY `idx_visitors_request_document` (`request_document`),
  KEY `fk_visitors_users_idx` (`input_by_user_id`),
  KEY `idx_visitors_checkout_by_user` (`checkout_by_user_id`),
  KEY `idx_visitors_checkout_by_name` (`checkout_by_name`),
  CONSTRAINT `fk_visitors_checkout_user` FOREIGN KEY (`checkout_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_visitors_users` FOREIGN KEY (`input_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table ult_fpeb_dev.visitor_actions
CREATE TABLE IF NOT EXISTS `visitor_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visitor_id` int NOT NULL,
  `action_type` enum('edit','delete') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `original_data` json DEFAULT NULL,
  `proposed_data` json DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `requested_by` int NOT NULL,
  `requested_by_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by_role` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed_by` int DEFAULT NULL,
  `processed_by_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visitor_id` (`visitor_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
