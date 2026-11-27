-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 27, 2026 at 05:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `student-management`
--

-- --------------------------------------------------------

--
-- Table structure for table `advisor_classe_sections`
--

CREATE TABLE `advisor_classe_sections` (
  `id` bigint(20) NOT NULL,
  `employee_id` bigint(20) NOT NULL,
  `student_class_id` bigint(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `advisor_classe_sections`
--

INSERT INTO `advisor_classe_sections` (`id`, `employee_id`, `student_class_id`, `start_date`, `end_date`, `created_at`) VALUES
(1, 7, 5, '2026-11-25', NULL, '2026-11-25 17:09:11'),
(2, 9, 1, '2026-11-25', NULL, '2026-11-25 23:35:41');

--
-- Triggers `advisor_classe_sections`
--
DELIMITER $$
CREATE TRIGGER `trg_advisor_bi` BEFORE INSERT ON `advisor_classe_sections` FOR EACH ROW BEGIN
    IF EXISTS (
        SELECT 1 FROM advisor_classe_sections a
        WHERE a.student_class_id = NEW.student_class_id
          AND a.start_date <= COALESCE(NEW.end_date, '9999-12-31')
          AND COALESCE(a.end_date, '9999-12-31') >= NEW.start_date
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Phan cong bi chong lan thoi gian voi CVHT khac cua lop nay';
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_advisor_bu` BEFORE UPDATE ON `advisor_classe_sections` FOR EACH ROW BEGIN
    IF EXISTS (
        SELECT 1 FROM advisor_classe_sections a
        WHERE a.id <> NEW.id
          AND a.student_class_id = NEW.student_class_id
          AND a.start_date <= COALESCE(NEW.end_date, '9999-12-31')
          AND COALESCE(a.end_date, '9999-12-31') >= NEW.start_date
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Phan cong bi chong lan thoi gian voi CVHT khac cua lop nay';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `attendances`
--

CREATE TABLE `attendances` (
  `id` bigint(20) NOT NULL,
  `enrollment_id` bigint(20) NOT NULL,
  `date` date NOT NULL,
  `status` enum('present','absent','late','excused') NOT NULL DEFAULT 'present',
  `note` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendances`
--

INSERT INTO `attendances` (`id`, `enrollment_id`, `date`, `status`, `note`) VALUES
(1, 1, '2026-10-05', 'present', NULL),
(2, 1, '2026-10-12', 'absent', NULL),
(3, 1, '2026-10-19', 'late', 'Trễ 10 phút'),
(4, 1, '2026-10-26', 'present', NULL),
(5, 2, '2026-10-06', 'present', NULL),
(6, 2, '2026-10-13', 'excused', 'Nghỉ ốm có giấy'),
(7, 2, '2026-10-20', 'absent', NULL),
(8, 3, '2026-10-07', 'present', NULL),
(9, 3, '2026-10-14', 'present', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `attendance_sessions`
--

CREATE TABLE `attendance_sessions` (
  `id` bigint(20) NOT NULL,
  `section_id` bigint(20) NOT NULL,
  `number` int(11) NOT NULL,
  `date` date NOT NULL,
  `status` enum('open','locked') NOT NULL DEFAULT 'open',
  `note` varchar(500) DEFAULT NULL,
  `locked_by` varchar(150) DEFAULT NULL,
  `locked_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendance_sessions`
--

INSERT INTO `attendance_sessions` (`id`, `section_id`, `number`, `date`, `status`, `note`, `locked_by`, `locked_at`, `created_at`) VALUES
(1, 25, 1, '2026-11-26', 'open', NULL, NULL, NULL, '2026-11-26 13:51:19.318326'),
(2, 26, 1, '2026-11-26', 'open', NULL, NULL, NULL, '2026-11-26 13:51:27.737946'),
(3, 27, 1, '2026-11-26', 'open', NULL, NULL, NULL, '2026-11-26 13:51:32.158473');

-- --------------------------------------------------------

--
-- Table structure for table `class_sections`
--

CREATE TABLE `class_sections` (
  `id` bigint(20) NOT NULL,
  `section_code` varchar(30) NOT NULL,
  `subject_id` bigint(20) NOT NULL,
  `term_id` bigint(20) NOT NULL,
  `employee_id` bigint(20) DEFAULT NULL,
  `max_students` smallint(5) UNSIGNED NOT NULL DEFAULT 60,
  `day_of_week` tinyint(3) UNSIGNED DEFAULT NULL,
  `start_period` tinyint(3) UNSIGNED DEFAULT NULL,
  `end_period` tinyint(3) UNSIGNED DEFAULT NULL,
  `room` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `class_sections`
--

INSERT INTO `class_sections` (`id`, `section_code`, `subject_id`, `term_id`, `employee_id`, `max_students`, `day_of_week`, `start_period`, `end_period`, `room`, `is_active`, `created_at`, `deleted_at`) VALUES
(1, 'INT101-01', 1, 2, NULL, 40, 2, 1, 3, 'A101', 1, '2026-11-19 14:31:02', NULL),
(2, 'INT102-01', 2, 2, NULL, 40, 4, 4, 6, 'A102', 1, '2026-11-19 14:31:02', NULL),
(3, 'INT103-01', 3, 2, NULL, 40, 3, 1, 3, 'B201', 1, '2026-11-19 14:31:02', NULL),
(4, 'INT102-02', 2, 2, NULL, 40, 5, 7, 9, 'B202', 1, '2026-11-19 14:31:02', NULL),
(5, 'ENG101-01', 5, 2, NULL, 60, 6, 1, 2, 'C301', 1, '2026-11-19 14:31:02', NULL),
(17, 'INT101-21', 1, 2, NULL, 40, 2, 1, 3, 'A101', 1, '2026-11-19 15:14:10', NULL),
(18, 'INT101-22', 1, 2, NULL, 40, 5, 7, 9, 'A102', 1, '2026-11-19 15:14:10', NULL),
(19, 'INT102-21', 2, 2, NULL, 40, 3, 1, 3, 'A103', 1, '2026-11-19 15:14:10', NULL),
(20, 'INT102-22', 2, 2, NULL, 40, 2, 2, 4, 'A107', 1, '2026-11-19 15:14:10', NULL),
(21, 'INT103-21', 3, 2, NULL, 40, 4, 4, 6, 'A104', 1, '2026-11-19 15:14:10', NULL),
(22, 'INT103-22', 3, 2, NULL, 40, 6, 1, 3, 'A105', 1, '2026-11-19 15:14:10', NULL),
(23, 'INT103-23', 3, 2, NULL, 2, 7, 7, 9, 'A108', 1, '2026-11-19 15:14:10', NULL),
(24, 'INT104-21', 6, 2, NULL, 40, 5, 4, 6, 'A106', 1, '2026-11-19 15:14:10', NULL),
(25, 'ACC101-21', 4, 2, NULL, 40, 2, 1, 3, 'B101', 1, '2026-11-19 15:14:10', NULL),
(26, 'ACC101-22', 4, 2, NULL, 40, 4, 7, 9, 'B102', 1, '2026-11-19 15:14:10', NULL),
(27, 'ACC102-21', 7, 2, NULL, 40, 3, 4, 6, 'B103', 1, '2026-11-19 15:14:10', NULL),
(28, 'ACC103-21', 8, 2, NULL, 40, 5, 1, 3, 'B104', 1, '2026-11-19 15:14:10', NULL),
(29, 'ACC103-22', 8, 2, NULL, 40, 6, 4, 6, 'B105', 1, '2026-11-19 15:14:10', NULL),
(30, 'LNG101-21', 9, 2, NULL, 40, 2, 4, 6, 'C101', 1, '2026-11-19 15:14:10', NULL),
(31, 'LNG102-21', 10, 2, NULL, 40, 3, 1, 3, 'C102', 1, '2026-11-19 15:14:10', NULL),
(32, 'LNG102-22', 10, 2, NULL, 40, 5, 7, 9, 'C103', 1, '2026-11-19 15:14:10', NULL),
(33, 'LNG103-21', 11, 2, NULL, 40, 4, 1, 3, 'C104', 1, '2026-11-19 15:14:10', NULL),
(34, 'BUS101-21', 12, 2, NULL, 40, 2, 7, 9, 'D101', 1, '2026-11-19 15:14:10', NULL),
(35, 'BUS102-21', 13, 2, NULL, 40, 3, 4, 6, 'D102', 1, '2026-11-19 15:14:10', NULL),
(36, 'BUS102-22', 13, 2, NULL, 40, 6, 1, 3, 'D103', 1, '2026-11-19 15:14:10', NULL),
(37, 'BUS103-21', 14, 2, NULL, 40, 4, 4, 6, 'D104', 1, '2026-11-19 15:14:10', NULL),
(38, 'ENG101-21', 5, 2, NULL, 60, 7, 1, 3, 'E101', 1, '2026-11-19 15:14:10', NULL),
(39, 'ENG101-22', 5, 2, NULL, 60, 3, 7, 9, 'E102', 1, '2026-11-19 15:14:10', NULL),
(40, 'GEN101-21', 15, 2, NULL, 80, 6, 7, 9, 'E103', 1, '2026-11-19 15:14:10', NULL),
(41, 'GEN102-21', 16, 2, NULL, 80, 7, 4, 6, 'E104', 1, '2026-11-19 15:14:10', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` bigint(20) NOT NULL,
  `course_code` varchar(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `department` varchar(150) NOT NULL,
  `category` varchar(20) NOT NULL DEFAULT 'major',
  `theory_credits` tinyint(4) NOT NULL DEFAULT 0,
  `practice_credits` tinyint(4) NOT NULL DEFAULT 0,
  `credits` tinyint(4) NOT NULL DEFAULT 0,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `w_attendance` tinyint(4) NOT NULL DEFAULT 10,
  `w_assignment` tinyint(4) NOT NULL DEFAULT 20,
  `w_midterm` tinyint(4) NOT NULL DEFAULT 20,
  `w_final` tinyint(4) NOT NULL DEFAULT 50,
  `syllabus_approved` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `course_code`, `name`, `description`, `department`, `category`, `theory_credits`, `practice_credits`, `credits`, `is_required`, `w_attendance`, `w_assignment`, `w_midterm`, `w_final`, `syllabus_approved`, `status`, `created_at`) VALUES
(1, 'INT3110', 'Lập trình Web & Ứng dụng', 'Học phần bắt buộc chuyên ngành', 'BM CN Phần mềm', 'major', 2, 1, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-19 14:47:48'),
(2, 'INT1006', 'Cơ sở dữ liệu', 'Cơ sở nhóm ngành CNTT', 'BM Hệ thống TT', 'foundation', 3, 1, 4, 1, 10, 20, 20, 50, 1, 'active', '2026-11-19 14:47:48'),
(3, 'MAT1093', 'Giải tích 1', 'Khối kiến thức đại cương toàn trường', 'Viện Toán UD', 'general', 3, 0, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-19 14:47:48'),
(4, 'INT3306', 'Phát triển ứng dụng di động', 'Tự chọn chuyên ngành CNPM', 'BM CN Phần mềm', 'elective', 2, 1, 3, 0, 10, 20, 20, 50, 0, 'active', '2026-11-19 14:47:48'),
(5, 'INT2204', 'Lập trình hướng đối tượng', 'Học phần cơ sở ngành', 'BM CN Phần mềm', 'foundation', 2, 1, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-19 14:47:48'),
(6, 'INT1001', 'Tin học đại cương', 'Khối kiến thức đại cương', 'BM Hệ thống TT', 'general', 2, 1, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-19 14:47:48'),
(7, 'MAT1094', 'Giải tích 2', 'Chuỗi, tích phân bội và phương trình vi phân', 'Viện Toán UD', 'general', 3, 0, 3, 1, 10, 10, 20, 60, 1, 'active', '2026-11-25 17:06:45'),
(8, 'MAT1101', 'Đại số tuyến tính', 'Ma trận, không gian vector, ánh xạ tuyến tính', 'Viện Toán UD', 'general', 3, 0, 3, 1, 10, 10, 20, 60, 1, 'active', '2026-11-25 17:06:45'),
(9, 'PHI1006', 'Triết học Mác - Lênin', 'Học phần lý luận chính trị bắt buộc', 'Khoa Lý luận chính trị', 'general', 3, 0, 3, 1, 10, 10, 20, 60, 1, 'active', '2026-11-25 17:06:45'),
(10, 'ENG1001', 'Tiếng Anh 1', 'Tiếng Anh cơ bản, trình độ A2', 'Khoa Ngoại ngữ', 'general', 3, 0, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-25 17:06:45'),
(11, 'ENG1002', 'Tiếng Anh 2', 'Tiếng Anh giao tiếp, trình độ B1', 'Khoa Ngoại ngữ', 'general', 3, 0, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-25 17:06:45'),
(12, 'INT1008', 'Lập trình cơ bản', 'Nhập môn lập trình với ngôn ngữ C', 'BM KH Máy tính', 'foundation', 2, 1, 3, 1, 10, 30, 20, 40, 1, 'active', '2026-11-25 17:06:45'),
(13, 'INT2210', 'Cấu trúc dữ liệu và giải thuật', 'Danh sách, cây, đồ thị, sắp xếp, tìm kiếm', 'BM KH Máy tính', 'foundation', 3, 1, 4, 1, 10, 20, 20, 50, 1, 'active', '2026-11-25 17:06:45'),
(14, 'INT2212', 'Kiến trúc máy tính', 'Tổ chức CPU, bộ nhớ và hệ thống vào ra', 'BM KH Máy tính', 'foundation', 3, 0, 3, 1, 10, 10, 20, 60, 1, 'active', '2026-11-25 17:06:45'),
(15, 'INT2213', 'Mạng máy tính', 'Mô hình OSI, TCP/IP và các giao thức cơ bản', 'BM Mạng & ATTT', 'foundation', 3, 1, 4, 1, 10, 20, 20, 50, 1, 'active', '2026-11-25 17:06:45'),
(16, 'INT2214', 'Hệ điều hành', 'Quản lý tiến trình, bộ nhớ, hệ thống tệp', 'BM KH Máy tính', 'foundation', 3, 0, 3, 1, 10, 10, 20, 60, 1, 'active', '2026-11-25 17:06:45'),
(17, 'INT3105', 'Phân tích thiết kế hệ thống', 'Phân tích yêu cầu, mô hình UML', 'BM CN Phần mềm', 'major', 2, 1, 3, 1, 10, 30, 20, 40, 1, 'active', '2026-11-25 17:06:45'),
(18, 'INT3120', 'Công nghệ phần mềm', 'Quy trình phát triển và quản lý dự án phần mềm', 'BM CN Phần mềm', 'major', 3, 0, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-25 17:06:45'),
(19, 'INT3117', 'Kiểm thử phần mềm', 'Kỹ thuật thiết kế ca kiểm thử và kiểm thử tự động', 'BM CN Phần mềm', 'major', 2, 1, 3, 1, 10, 30, 20, 40, 0, 'active', '2026-11-25 17:06:45'),
(20, 'INT3401', 'Trí tuệ nhân tạo', 'Tìm kiếm, biểu diễn tri thức, học máy cơ bản', 'BM KH Máy tính', 'major', 3, 0, 3, 1, 10, 10, 20, 60, 1, 'active', '2026-11-25 17:06:45'),
(21, 'INT3404', 'Xử lý ảnh', 'Biến đổi ảnh, lọc nhiễu, phát hiện biên', 'BM KH Máy tính', 'major', 2, 1, 3, 0, 10, 30, 20, 40, 0, 'active', '2026-11-25 17:06:45'),
(22, 'INT3505', 'An toàn thông tin', 'Mật mã, xác thực và bảo mật hệ thống', 'BM Mạng & ATTT', 'major', 2, 1, 3, 1, 10, 20, 20, 50, 1, 'active', '2026-11-25 17:06:45'),
(23, 'INT3307', 'Lập trình Java nâng cao', 'Đa luồng, JDBC, framework Spring', 'BM CN Phần mềm', 'elective', 2, 1, 3, 0, 10, 30, 20, 40, 0, 'active', '2026-11-25 17:06:45'),
(24, 'INT3308', 'Điện toán đám mây', 'Ảo hóa, container và dịch vụ đám mây', 'BM Mạng & ATTT', 'elective', 2, 1, 3, 0, 10, 30, 20, 40, 0, 'active', '2026-11-25 17:06:45'),
(25, 'INT4040', 'Trí tuệ nhân tạo nâng cao', 'Chuyên ngành KHMT & Trí tuệ nhân tạo', 'BM KH Máy tính', 'elective', 2, 1, 3, 0, 10, 20, 20, 50, 0, 'active', '2026-11-25 17:06:45'),
(26, 'INT4050', 'Đồ án tốt nghiệp', 'Thực hiện và bảo vệ đồ án cuối khóa', 'BM CN Phần mềm', 'major', 0, 6, 6, 1, 0, 30, 0, 70, 0, 'active', '2026-11-25 17:06:45'),
(27, 'INT1002', 'Tin học cơ sở (chương trình cũ)', 'Đã thay bằng Tin học đại cương', 'BM Hệ thống TT', 'general', 2, 1, 3, 0, 10, 20, 20, 50, 1, 'inactive', '2026-11-25 17:06:45');

-- --------------------------------------------------------

--
-- Table structure for table `course_prerequisites`
--

CREATE TABLE `course_prerequisites` (
  `id` bigint(20) NOT NULL,
  `course_id` bigint(20) NOT NULL,
  `prerequisite_id` bigint(20) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'prerequisite'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `course_prerequisites`
--

INSERT INTO `course_prerequisites` (`id`, `course_id`, `prerequisite_id`, `type`) VALUES
(1, 1, 2, 'prerequisite'),
(2, 1, 5, 'prerequisite'),
(4, 1, 6, 'prior'),
(5, 12, 6, 'prior'),
(6, 5, 12, 'prerequisite'),
(7, 13, 12, 'prerequisite'),
(8, 13, 8, 'prior'),
(9, 15, 14, 'prior'),
(10, 16, 13, 'prerequisite'),
(11, 16, 14, 'prerequisite'),
(12, 17, 2, 'prerequisite'),
(13, 18, 5, 'prerequisite'),
(14, 19, 18, 'prerequisite'),
(15, 4, 5, 'prerequisite'),
(16, 23, 5, 'prerequisite'),
(17, 24, 15, 'prerequisite'),
(18, 20, 13, 'prerequisite'),
(19, 20, 8, 'prerequisite'),
(20, 21, 20, 'prior'),
(21, 22, 15, 'prerequisite'),
(22, 7, 3, 'prerequisite'),
(23, 11, 10, 'prerequisite'),
(24, 25, 20, 'prerequisite'),
(25, 26, 1, 'prior'),
(26, 26, 18, 'prerequisite');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` bigint(20) NOT NULL,
  `employee_code` varchar(30) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `employee_code`, `full_name`, `email`, `is_active`) VALUES
(1, 'GV001', 'Nguyễn Văn Anh', 'anh.nv@example.com', 1),
(2, 'GV002', 'Trần Thị Bình', 'binh.tt@example.com', 1),
(3, 'GV003', 'Lê Văn Chiến', 'chien.lv@example.com', 1),
(4, 'GV004', 'Phạm Thị Dung', 'dung.pt@example.com', 1),
(5, 'GV005', 'Hoàng Minh Đức', 'duc.hm@example.com', 1),
(6, 'GV006', 'Võ Thị Hà', 'ha.vt@example.com', 1),
(7, 'GV007', 'Đặng Quang Huy', 'huy.dq@example.com', 1),
(8, 'GV008', 'Bùi Thị Lan', 'lan.bt@example.com', 1),
(9, 'GV009', 'Ngô Văn Nam', 'nam.nv@example.com', 1),
(10, 'GV010', 'Lê Quang Phúc', 'phuc.lq@example.com', 0);

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `section_id` bigint(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'enrolled',
  `enrolled_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `enrollments`
--

INSERT INTO `enrollments` (`id`, `student_id`, `section_id`, `status`, `enrolled_at`) VALUES
(1, 5, 1, 'enrolled', '2026-11-19 14:31:02'),
(2, 6, 1, 'enrolled', '2026-11-19 14:31:02'),
(3, 7, 1, 'enrolled', '2026-11-19 14:31:02'),
(4, 8, 1, 'enrolled', '2026-11-19 14:31:02'),
(5, 9, 1, 'enrolled', '2026-11-19 14:31:02'),
(6, 5, 2, 'enrolled', '2026-11-19 14:31:02'),
(7, 6, 2, 'enrolled', '2026-11-19 14:31:02'),
(8, 7, 2, 'enrolled', '2026-11-19 14:31:02'),
(9, 5, 3, 'enrolled', '2026-11-19 14:31:02'),
(10, 6, 3, 'enrolled', '2026-11-19 14:31:02'),
(11, 7, 3, 'enrolled', '2026-11-19 14:31:02'),
(12, 5, 5, 'enrolled', '2026-11-19 14:31:02'),
(13, 1, 1, 'dropped', '2026-11-19 14:54:47'),
(14, 1, 2, 'dropped', '2026-11-19 15:04:23'),
(15, 1, 17, 'enrolled', '2026-11-19 15:14:10'),
(16, 1, 19, 'enrolled', '2026-11-19 15:14:10'),
(17, 1, 21, 'enrolled', '2026-11-19 15:14:10'),
(18, 1, 38, 'enrolled', '2026-11-19 15:14:10'),
(19, 1, 24, 'enrolled', '2026-11-19 15:14:10'),
(20, 1, 40, 'enrolled', '2026-11-19 15:14:10'),
(21, 1, 41, 'enrolled', '2026-11-19 15:14:10'),
(22, 2, 17, 'enrolled', '2026-11-19 15:14:10'),
(23, 2, 19, 'enrolled', '2026-11-19 15:14:10'),
(24, 2, 21, 'dropped', '2026-11-19 15:14:10'),
(25, 2, 38, 'dropped', '2026-11-19 15:14:10'),
(26, 2, 24, 'enrolled', '2026-11-19 15:14:10'),
(27, 2, 40, 'enrolled', '2026-11-19 15:14:10'),
(28, 2, 41, 'enrolled', '2026-11-19 15:14:10'),
(29, 3, 25, 'enrolled', '2026-11-19 15:14:10'),
(30, 3, 38, 'enrolled', '2026-11-19 15:14:10'),
(31, 3, 27, 'enrolled', '2026-11-19 15:14:10'),
(32, 3, 28, 'enrolled', '2026-11-19 15:14:10'),
(33, 3, 40, 'enrolled', '2026-11-19 15:14:10'),
(34, 3, 41, 'enrolled', '2026-11-19 15:14:10'),
(35, 4, 38, 'enrolled', '2026-11-19 15:14:10'),
(36, 4, 30, 'enrolled', '2026-11-19 15:14:10'),
(37, 4, 31, 'enrolled', '2026-11-19 15:14:10'),
(38, 4, 33, 'enrolled', '2026-11-19 15:14:10'),
(39, 4, 40, 'enrolled', '2026-11-19 15:14:10'),
(40, 4, 41, 'enrolled', '2026-11-19 15:14:10'),
(41, 5, 17, 'dropped', '2026-11-19 15:14:10'),
(42, 5, 19, 'dropped', '2026-11-19 15:14:10'),
(43, 5, 21, 'dropped', '2026-11-19 15:14:10'),
(44, 5, 38, 'dropped', '2026-11-19 15:14:10'),
(45, 5, 24, 'enrolled', '2026-11-19 15:14:10'),
(46, 5, 40, 'enrolled', '2026-11-19 15:14:10'),
(47, 5, 41, 'enrolled', '2026-11-19 15:14:10'),
(48, 6, 17, 'dropped', '2026-11-19 15:14:10'),
(49, 6, 19, 'dropped', '2026-11-19 15:14:10'),
(50, 6, 21, 'dropped', '2026-11-19 15:14:10'),
(51, 6, 38, 'enrolled', '2026-11-19 15:14:10'),
(52, 6, 24, 'enrolled', '2026-11-19 15:14:10'),
(53, 6, 40, 'enrolled', '2026-11-19 15:14:10'),
(54, 6, 41, 'enrolled', '2026-11-19 15:14:10'),
(55, 7, 17, 'dropped', '2026-11-19 15:14:10'),
(56, 7, 19, 'dropped', '2026-11-19 15:14:10'),
(57, 7, 21, 'dropped', '2026-11-19 15:14:10'),
(58, 7, 38, 'enrolled', '2026-11-19 15:14:10'),
(59, 7, 24, 'enrolled', '2026-11-19 15:14:10'),
(60, 7, 40, 'enrolled', '2026-11-19 15:14:10'),
(61, 7, 41, 'enrolled', '2026-11-19 15:14:10'),
(62, 8, 17, 'dropped', '2026-11-19 15:14:10'),
(63, 8, 19, 'enrolled', '2026-11-19 15:14:10'),
(64, 8, 21, 'enrolled', '2026-11-19 15:14:10'),
(65, 8, 38, 'enrolled', '2026-11-19 15:14:10'),
(66, 8, 24, 'enrolled', '2026-11-19 15:14:10'),
(67, 8, 40, 'enrolled', '2026-11-19 15:14:10'),
(68, 8, 41, 'enrolled', '2026-11-19 15:14:10'),
(69, 9, 17, 'dropped', '2026-11-19 15:14:10'),
(70, 9, 19, 'enrolled', '2026-11-19 15:14:10'),
(71, 9, 21, 'enrolled', '2026-11-19 15:14:10'),
(72, 9, 38, 'enrolled', '2026-11-19 15:14:10'),
(73, 9, 24, 'enrolled', '2026-11-19 15:14:10'),
(74, 9, 40, 'enrolled', '2026-11-19 15:14:10'),
(75, 9, 41, 'enrolled', '2026-11-19 15:14:10'),
(76, 10, 17, 'enrolled', '2026-11-19 15:14:10'),
(77, 10, 19, 'enrolled', '2026-11-19 15:14:10'),
(78, 10, 21, 'enrolled', '2026-11-19 15:14:10'),
(79, 10, 38, 'enrolled', '2026-11-19 15:14:10'),
(80, 10, 24, 'enrolled', '2026-11-19 15:14:10'),
(81, 10, 40, 'enrolled', '2026-11-19 15:14:10'),
(82, 10, 41, 'enrolled', '2026-11-19 15:14:10'),
(83, 11, 17, 'enrolled', '2026-11-19 15:14:10'),
(84, 11, 19, 'enrolled', '2026-11-19 15:14:10'),
(85, 11, 21, 'enrolled', '2026-11-19 15:14:10'),
(86, 11, 38, 'enrolled', '2026-11-19 15:14:10'),
(87, 11, 24, 'enrolled', '2026-11-19 15:14:10'),
(88, 11, 40, 'enrolled', '2026-11-19 15:14:10'),
(89, 11, 41, 'enrolled', '2026-11-19 15:14:10'),
(90, 12, 17, 'enrolled', '2026-11-19 15:14:10'),
(91, 12, 19, 'enrolled', '2026-11-19 15:14:10'),
(92, 12, 21, 'enrolled', '2026-11-19 15:14:10'),
(93, 12, 38, 'enrolled', '2026-11-19 15:14:10'),
(94, 12, 24, 'enrolled', '2026-11-19 15:14:10'),
(95, 12, 40, 'enrolled', '2026-11-19 15:14:10'),
(96, 12, 41, 'enrolled', '2026-11-19 15:14:10'),
(97, 13, 17, 'enrolled', '2026-11-19 15:14:10'),
(98, 13, 19, 'enrolled', '2026-11-19 15:14:10'),
(99, 13, 21, 'enrolled', '2026-11-19 15:14:10'),
(100, 13, 38, 'enrolled', '2026-11-19 15:14:10'),
(101, 13, 24, 'enrolled', '2026-11-19 15:14:10'),
(102, 13, 40, 'enrolled', '2026-11-19 15:14:10'),
(103, 13, 41, 'enrolled', '2026-11-19 15:14:10'),
(104, 14, 17, 'enrolled', '2026-11-19 15:14:10'),
(105, 14, 19, 'enrolled', '2026-11-19 15:14:10'),
(106, 14, 21, 'enrolled', '2026-11-19 15:14:10'),
(107, 14, 38, 'enrolled', '2026-11-19 15:14:10'),
(108, 14, 24, 'enrolled', '2026-11-19 15:14:10'),
(109, 14, 40, 'enrolled', '2026-11-19 15:14:10'),
(110, 14, 41, 'enrolled', '2026-11-19 15:14:10'),
(111, 15, 17, 'enrolled', '2026-11-19 15:14:10'),
(112, 15, 19, 'enrolled', '2026-11-19 15:14:10'),
(113, 15, 21, 'enrolled', '2026-11-19 15:14:10'),
(114, 15, 38, 'enrolled', '2026-11-19 15:14:10'),
(115, 15, 24, 'enrolled', '2026-11-19 15:14:10'),
(116, 15, 40, 'enrolled', '2026-11-19 15:14:10'),
(117, 15, 41, 'enrolled', '2026-11-19 15:14:10'),
(118, 16, 17, 'enrolled', '2026-11-19 15:14:10'),
(119, 16, 19, 'enrolled', '2026-11-19 15:14:10'),
(120, 16, 21, 'enrolled', '2026-11-19 15:14:10'),
(121, 16, 38, 'enrolled', '2026-11-19 15:14:10'),
(122, 16, 24, 'enrolled', '2026-11-19 15:14:10'),
(123, 16, 40, 'enrolled', '2026-11-19 15:14:10'),
(124, 16, 41, 'enrolled', '2026-11-19 15:14:10'),
(125, 17, 17, 'enrolled', '2026-11-19 15:14:10'),
(126, 17, 19, 'enrolled', '2026-11-19 15:14:10'),
(127, 17, 21, 'enrolled', '2026-11-19 15:14:10'),
(128, 17, 38, 'enrolled', '2026-11-19 15:14:10'),
(129, 17, 24, 'enrolled', '2026-11-19 15:14:10'),
(130, 17, 40, 'enrolled', '2026-11-19 15:14:10'),
(131, 17, 41, 'enrolled', '2026-11-19 15:14:10'),
(132, 18, 17, 'enrolled', '2026-11-19 15:14:10'),
(133, 18, 19, 'enrolled', '2026-11-19 15:14:10'),
(134, 18, 21, 'enrolled', '2026-11-19 15:14:10'),
(135, 18, 38, 'enrolled', '2026-11-19 15:14:10'),
(136, 18, 24, 'enrolled', '2026-11-19 15:14:10'),
(137, 18, 40, 'enrolled', '2026-11-19 15:14:10'),
(138, 18, 41, 'enrolled', '2026-11-19 15:14:10'),
(139, 19, 17, 'enrolled', '2026-11-19 15:14:10'),
(140, 19, 19, 'enrolled', '2026-11-19 15:14:10'),
(141, 19, 21, 'enrolled', '2026-11-19 15:14:10'),
(142, 19, 38, 'enrolled', '2026-11-19 15:14:10'),
(143, 19, 24, 'enrolled', '2026-11-19 15:14:10'),
(144, 19, 40, 'enrolled', '2026-11-19 15:14:10'),
(145, 19, 41, 'enrolled', '2026-11-19 15:14:10'),
(146, 20, 17, 'enrolled', '2026-11-19 15:14:10'),
(147, 20, 19, 'enrolled', '2026-11-19 15:14:10'),
(148, 20, 21, 'enrolled', '2026-11-19 15:14:10'),
(149, 20, 38, 'enrolled', '2026-11-19 15:14:10'),
(150, 20, 24, 'enrolled', '2026-11-19 15:14:10'),
(151, 20, 40, 'enrolled', '2026-11-19 15:14:10'),
(152, 20, 41, 'enrolled', '2026-11-19 15:14:10'),
(153, 21, 17, 'enrolled', '2026-11-19 15:14:10'),
(154, 21, 19, 'enrolled', '2026-11-19 15:14:10'),
(155, 21, 21, 'enrolled', '2026-11-19 15:14:10'),
(156, 21, 38, 'enrolled', '2026-11-19 15:14:10'),
(157, 21, 24, 'enrolled', '2026-11-19 15:14:10'),
(158, 21, 40, 'enrolled', '2026-11-19 15:14:10'),
(159, 21, 41, 'enrolled', '2026-11-19 15:14:10'),
(160, 22, 17, 'enrolled', '2026-11-19 15:14:10'),
(161, 22, 19, 'enrolled', '2026-11-19 15:14:10'),
(162, 22, 21, 'enrolled', '2026-11-19 15:14:10'),
(163, 22, 38, 'enrolled', '2026-11-19 15:14:10'),
(164, 22, 24, 'enrolled', '2026-11-19 15:14:10'),
(165, 22, 40, 'enrolled', '2026-11-19 15:14:10'),
(166, 22, 41, 'enrolled', '2026-11-19 15:14:10'),
(167, 23, 17, 'enrolled', '2026-11-19 15:14:10'),
(168, 23, 19, 'enrolled', '2026-11-19 15:14:10'),
(169, 23, 21, 'enrolled', '2026-11-19 15:14:10'),
(170, 23, 38, 'enrolled', '2026-11-19 15:14:10'),
(171, 23, 24, 'enrolled', '2026-11-19 15:14:10'),
(172, 23, 40, 'enrolled', '2026-11-19 15:14:10'),
(173, 23, 41, 'enrolled', '2026-11-19 15:14:10'),
(174, 24, 17, 'enrolled', '2026-11-19 15:14:10'),
(175, 24, 19, 'enrolled', '2026-11-19 15:14:10'),
(176, 24, 21, 'enrolled', '2026-11-19 15:14:10'),
(177, 24, 38, 'enrolled', '2026-11-19 15:14:10'),
(178, 24, 24, 'enrolled', '2026-11-19 15:14:10'),
(179, 24, 40, 'enrolled', '2026-11-19 15:14:10'),
(180, 24, 41, 'enrolled', '2026-11-19 15:14:10'),
(181, 25, 17, 'enrolled', '2026-11-19 15:14:10'),
(182, 25, 19, 'enrolled', '2026-11-19 15:14:10'),
(183, 25, 21, 'enrolled', '2026-11-19 15:14:10'),
(184, 25, 38, 'enrolled', '2026-11-19 15:14:10'),
(185, 25, 24, 'enrolled', '2026-11-19 15:14:10'),
(186, 25, 40, 'enrolled', '2026-11-19 15:14:10'),
(187, 25, 41, 'enrolled', '2026-11-19 15:14:10'),
(188, 26, 17, 'enrolled', '2026-11-19 15:14:10'),
(189, 26, 19, 'enrolled', '2026-11-19 15:14:10'),
(190, 26, 21, 'enrolled', '2026-11-19 15:14:10'),
(191, 26, 38, 'enrolled', '2026-11-19 15:14:10'),
(192, 26, 24, 'enrolled', '2026-11-19 15:14:10'),
(193, 26, 40, 'enrolled', '2026-11-19 15:14:10'),
(194, 26, 41, 'enrolled', '2026-11-19 15:14:10'),
(195, 27, 17, 'enrolled', '2026-11-19 15:14:10'),
(196, 27, 19, 'enrolled', '2026-11-19 15:14:10'),
(197, 27, 21, 'enrolled', '2026-11-19 15:14:10'),
(198, 27, 38, 'enrolled', '2026-11-19 15:14:10'),
(199, 27, 24, 'enrolled', '2026-11-19 15:14:10'),
(200, 27, 40, 'enrolled', '2026-11-19 15:14:10'),
(201, 27, 41, 'enrolled', '2026-11-19 15:14:10'),
(202, 28, 17, 'enrolled', '2026-11-19 15:14:10'),
(203, 28, 19, 'enrolled', '2026-11-19 15:14:10'),
(204, 28, 21, 'enrolled', '2026-11-19 15:14:10'),
(205, 28, 38, 'enrolled', '2026-11-19 15:14:10'),
(206, 28, 24, 'enrolled', '2026-11-19 15:14:10'),
(207, 28, 40, 'enrolled', '2026-11-19 15:14:10'),
(208, 28, 41, 'enrolled', '2026-11-19 15:14:10'),
(209, 29, 17, 'enrolled', '2026-11-19 15:14:10'),
(210, 29, 19, 'enrolled', '2026-11-19 15:14:10'),
(211, 29, 21, 'enrolled', '2026-11-19 15:14:10'),
(212, 29, 38, 'enrolled', '2026-11-19 15:14:10'),
(213, 29, 24, 'enrolled', '2026-11-19 15:14:10'),
(214, 29, 40, 'enrolled', '2026-11-19 15:14:10'),
(215, 29, 41, 'enrolled', '2026-11-19 15:14:10'),
(216, 30, 38, 'enrolled', '2026-11-19 15:14:10'),
(217, 30, 30, 'enrolled', '2026-11-19 15:14:10'),
(218, 30, 31, 'enrolled', '2026-11-19 15:14:10'),
(219, 30, 33, 'enrolled', '2026-11-19 15:14:10'),
(220, 30, 40, 'enrolled', '2026-11-19 15:14:10'),
(221, 30, 41, 'enrolled', '2026-11-19 15:14:10'),
(222, 31, 38, 'enrolled', '2026-11-19 15:14:10'),
(223, 31, 30, 'enrolled', '2026-11-19 15:14:10'),
(224, 31, 31, 'enrolled', '2026-11-19 15:14:10'),
(225, 31, 33, 'enrolled', '2026-11-19 15:14:10'),
(226, 31, 40, 'enrolled', '2026-11-19 15:14:10'),
(227, 31, 41, 'enrolled', '2026-11-19 15:14:10'),
(270, 1, 23, 'enrolled', '2026-11-19 15:14:10'),
(271, 2, 23, 'enrolled', '2026-11-19 15:14:10'),
(272, 1, 25, 'enrolled', '2026-11-26 13:10:07'),
(273, 5, 25, 'enrolled', '2026-11-26 13:10:07'),
(274, 6, 25, 'enrolled', '2026-11-26 13:10:07'),
(275, 7, 25, 'enrolled', '2026-11-26 13:10:07'),
(276, 8, 25, 'enrolled', '2026-11-26 13:10:07'),
(277, 9, 25, 'enrolled', '2026-11-26 13:10:07'),
(278, 10, 25, 'enrolled', '2026-11-26 13:10:07'),
(279, 12, 25, 'enrolled', '2026-11-26 13:10:07'),
(280, 13, 25, 'enrolled', '2026-11-26 13:10:07'),
(281, 14, 25, 'enrolled', '2026-11-26 13:10:07'),
(282, 15, 25, 'enrolled', '2026-11-26 13:10:07');

-- --------------------------------------------------------

--
-- Table structure for table `grades`
--

CREATE TABLE `grades` (
  `id` bigint(20) NOT NULL,
  `enrollment_id` bigint(20) NOT NULL,
  `attendance_score` decimal(4,2) DEFAULT NULL,
  `assignment_score` decimal(4,2) DEFAULT NULL,
  `midterm_score` decimal(4,2) DEFAULT NULL,
  `final_score` decimal(4,2) DEFAULT NULL,
  `total_score` decimal(4,2) DEFAULT NULL,
  `letter_grade` varchar(2) DEFAULT NULL,
  `is_passed` tinyint(1) DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `updated_by` bigint(20) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `grades`
--

INSERT INTO `grades` (`id`, `enrollment_id`, `attendance_score`, `assignment_score`, `midterm_score`, `final_score`, `total_score`, `letter_grade`, `is_passed`, `is_locked`, `updated_by`, `updated_at`) VALUES
(1, 1, 9.00, NULL, 7.50, 8.00, 7.95, 'B', 1, 1, NULL, '2026-11-19 14:31:03'),
(2, 2, 10.00, NULL, 8.00, 9.00, 8.80, 'A', 1, 1, NULL, '2026-11-19 14:31:03'),
(3, 3, 8.00, NULL, 6.00, 7.00, 6.80, 'C+', 1, 1, NULL, '2026-11-19 14:31:03'),
(4, 4, 7.00, NULL, 5.00, 4.00, 4.60, 'D', 1, 1, NULL, '2026-11-19 14:31:03'),
(5, 5, 6.00, NULL, 3.00, 3.00, 3.30, 'F', 0, 1, NULL, '2026-11-19 14:31:03'),
(6, 6, 8.00, NULL, 8.00, 8.50, 8.30, 'B+', 1, 1, NULL, '2026-11-19 14:31:03'),
(7, 7, 9.00, NULL, 9.00, 9.50, 9.30, 'A', 1, 1, NULL, '2026-11-19 14:31:03'),
(8, 8, 10.00, NULL, 7.00, 6.00, 6.70, 'C+', 1, 1, NULL, '2026-11-19 14:31:03'),
(9, 272, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(10, 273, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(11, 274, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(12, 275, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(13, 276, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(14, 277, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(15, 278, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(16, 279, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(17, 280, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(18, 281, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07'),
(19, 282, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-11-26 13:10:07');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` bigint(20) NOT NULL,
  `student_code` varchar(20) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `date_of_birth` date NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `class_id` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `hometown` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `student_code`, `full_name`, `date_of_birth`, `gender`, `email`, `phone`, `class_id`, `created_at`, `updated_at`, `deleted_at`, `hometown`) VALUES
(1, 'SV2024001', 'Nguyễn Văn An', '2008-03-15', 'male', 'an.nguyen@example.com', '0901234567', 5, '2026-10-29 15:08:20', '2026-11-19 15:30:00', NULL, 'Đà Nẵng'),
(2, 'SV2026002', 'Hồ Ngọc Cẩm Đào', '2005-07-18', 'female', 'dao@gmail.com', '039726473', 1, '2026-10-31 08:56:30', '2026-10-31 14:12:45', NULL, NULL),
(3, 'SV2026003', 'Phạm Thanh Trang', '2008-02-20', 'female', 'trang@gmail.com', '0123456789', 6, '2026-10-31 14:11:24', '2026-11-19 13:05:42', NULL, NULL),
(4, 'SV2026004', 'Lê Hoàng Long', '2007-11-10', 'male', 'long.lh@example.com', '0903987654', 4, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(5, 'SV2026005', 'Phạm Thúy Nga', '2008-02-05', 'female', 'nga.pt@example.com', '0976112233', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(6, 'SV2026006', 'Đỗ Minh Quân', '2008-09-19', 'male', 'quan.dm@example.com', '0945667788', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(7, 'SV2026007', 'Vũ Hải Yến', '2008-03-30', 'female', 'yen.vh@example.com', '0938224466', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(8, 'SV2026008', 'Nguyễn Minh Anh', '2008-05-12', 'female', 'anh.nm@example.com', '0912345001', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(9, 'SV2026009', 'Trần Hoàng Nam', '2008-08-20', 'male', 'nam.th@example.com', '0912345002', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(10, 'SV2026010', 'Lê Ngọc Hà', '2007-02-14', 'female', 'ha.ln@example.com', '0912345003', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(11, 'SV2026011', 'Phạm Tuấn Kiệt', '2006-11-30', 'male', 'kiet.pt@example.com', '0912345004', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(12, 'SV2026012', 'Võ Thị Thanh Mai', '2008-03-25', 'female', 'mai.vtt@example.com', '0912345005', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(13, 'SV2026013', 'Đặng Quốc Bảo', '2008-01-15', 'male', 'bao.dq@example.com', '0912345006', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(14, 'SV2026014', 'Bùi Khánh Linh', '2008-09-08', 'female', 'linh.bk@example.com', '0912345007', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(15, 'SV2026015', 'Hoàng Đức Anh', '2008-07-22', 'male', 'anh.hd@example.com', '0912345008', 5, '2026-11-19 13:07:54', '2026-11-19 13:08:07', NULL, NULL),
(16, 'SV2026016', 'Ngô Phương Thảo', '2008-12-05', 'female', 'thao.np@example.com', '0912345009', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(17, 'SV2026017', 'Dương Gia Huy', '2008-04-18', 'male', 'huy.dg@example.com', '0912345010', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(18, 'SV2026018', 'Phan Thành Đạt', '2008-10-28', 'male', 'dat.pt@example.com', '0912345011', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(19, 'SV2026019', 'Đinh Gia Bảo', '2008-06-02', 'male', 'bao.dg@example.com', '0912345012', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(20, 'SV2026020', 'Võ Minh Quân', '2008-02-11', 'male', 'quan.vm@example.com', '0912345013', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(21, 'SV2026021', 'Đặng Thùy Trang', '2008-08-09', 'female', 'trang.dt@example.com', '0912345014', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(22, 'SV2026022', 'Đỗ Minh Nhật', '2007-12-21', 'male', 'nhat.dm@example.com', '0912345015', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(23, 'SV2026023', 'Lý Thu Hương', '2008-05-30', 'female', 'huong.lt@example.com', '0912345016', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(24, 'SV2026024', 'Trương Quang Vinh', '2008-01-27', 'male', 'vinh.tq@example.com', '0912345017', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(25, 'SV2026025', 'Huỳnh Bảo Ngọc', '2008-11-03', 'female', 'ngoc.hb@example.com', '0912345018', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(26, 'SV2026026', 'Mai Xuân Trường', '2007-09-16', 'male', 'truong.mx@example.com', '0912345019', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(27, 'SV2026027', 'Cao Diễm My', '2008-04-07', 'female', 'my.cd@example.com', '0912345020', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(28, 'SV2026028', 'Tạ Nhật Minh', '2008-07-14', 'male', 'minh.tn@example.com', '0912345021', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(29, 'SV2026029', 'Lưu Hồng Nhung', '2008-10-01', 'female', 'nhung.lh@example.com', '0912345022', 1, '2026-11-19 13:07:54', '2026-11-19 13:07:54', NULL, NULL),
(30, 'SV2026030', 'Châu Đức Thịnh', '2007-06-23', 'male', 'thinh.cd@example.com', '0912345023', 7, '2026-11-19 13:07:54', '2026-11-19 13:17:19', NULL, NULL),
(31, 'SV2026031', 'Kiều Anh Thư', '2008-03-12', 'female', 'thu.ka@example.com', '0912345024', 4, '2026-11-19 13:07:54', '2026-11-19 13:08:33', NULL, NULL);

--
-- Triggers `students`
--
DELIMITER $$
CREATE TRIGGER `trg_students_bi` BEFORE INSERT ON `students` FOR EACH ROW BEGIN
    IF NEW.date_of_birth > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ngay sinh khong duoc nam trong tuong lai';
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_students_bu` BEFORE UPDATE ON `students` FOR EACH ROW BEGIN
    IF NEW.date_of_birth > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ngay sinh khong duoc nam trong tuong lai';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `student_classes`
--

CREATE TABLE `student_classes` (
  `id` bigint(20) NOT NULL,
  `class_code` varchar(30) NOT NULL,
  `class_name` varchar(150) NOT NULL,
  `major_name` varchar(150) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_classes`
--

INSERT INTO `student_classes` (`id`, `class_code`, `class_name`, `major_name`, `academic_year`, `is_active`, `created_at`) VALUES
(1, 'CNTT01', 'Công nghệ thông tin 01', 'Công nghệ thông tin', '2024-2028', 1, '2026-10-29 14:36:32'),
(2, 'KT01', 'Kế toán 01', 'Kế toán', '2024-2028', 1, '2026-10-31 09:04:51'),
(3, 'QTKD01', 'Quản trị kinh doanh 01', 'Quản trị kinh doanh', '2024-2028', 1, '2026-10-31 09:04:51'),
(4, 'NNA01', 'Ngôn ngữ Anh 01', 'Ngôn ngữ', '2024-2028', 1, '2026-10-31 09:04:51'),
(5, 'CNTT02', 'Công nghệ thông tin 02', 'Công nghệ thông tin', '2024-2028', 1, '2026-10-31 09:06:40'),
(6, 'KT02', 'Kế Toán 02', 'Kế toán', '2024-2028', 1, '2026-11-19 13:05:33'),
(7, 'NNA02', 'Ngôn Ngữ Anh 02', 'Ngôn Ngữ', '2025-2029', 1, '2026-11-19 13:16:58');

-- --------------------------------------------------------

--
-- Table structure for table `student_status`
--

CREATE TABLE `student_status` (
  `id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `status` varchar(30) NOT NULL,
  `reason` text DEFAULT NULL,
  `effective_date` date NOT NULL,
  `created_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_status`
--

INSERT INTO `student_status` (`id`, `student_id`, `status`, `reason`, `effective_date`, `created_by`, `created_at`) VALUES
(1, 1, 'studying', 'Nhập học', '2026-10-29', NULL, '2026-10-29 15:08:20'),
(2, 2, 'studying', 'Nhập học', '2026-10-31', NULL, '2026-10-31 08:56:30'),
(3, 3, 'studying', 'Nhập học', '2026-10-31', NULL, '2026-10-31 14:11:24'),
(4, 3, 'dropped', NULL, '2026-10-31', NULL, '2026-10-31 14:11:32'),
(5, 3, 'graduated', NULL, '2026-10-31', NULL, '2026-10-31 14:11:47'),
(6, 3, 'reserved', NULL, '2026-11-01', NULL, '2026-11-01 14:36:20'),
(7, 3, 'dropped', NULL, '2026-11-04', NULL, '2026-11-04 14:36:41'),
(8, 4, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(9, 5, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(10, 6, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(11, 7, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(12, 8, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(13, 9, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(14, 10, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(15, 11, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(16, 12, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(17, 13, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(18, 14, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(19, 15, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(20, 16, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(21, 17, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(22, 18, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(23, 19, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(24, 20, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(25, 21, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(26, 22, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(27, 23, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(28, 24, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(29, 25, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(30, 26, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(31, 27, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(32, 28, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(33, 29, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(34, 30, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(35, 31, 'studying', 'Nhập học', '2026-11-19', NULL, '2026-11-19 13:07:54'),
(39, 31, 'graduated', NULL, '2026-11-19', NULL, '2026-11-19 13:09:42'),
(40, 2, 'dropped', 'về quê có việc nhà', '2026-11-19', NULL, '2026-11-19 13:35:12'),
(41, 11, 'reserved', 'có viết ở quê nhà, k thể học tiếp trong năm nay', '2026-11-19', NULL, '2026-11-19 13:44:58'),
(42, 4, 'reserved', '...', '2026-11-19', NULL, '2026-11-19 13:47:13'),
(43, 30, 'dropped', 'thích thì nghỉ', '2026-11-26', NULL, '2026-11-26 13:08:05'),
(44, 29, 'reserved', 'có việc gia đình', '2026-11-26', NULL, '2026-11-26 13:08:24');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` bigint(20) NOT NULL,
  `subject_code` varchar(20) NOT NULL,
  `subject_name` varchar(150) NOT NULL,
  `credits` tinyint(3) UNSIGNED NOT NULL,
  `major_name` varchar(150) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `course_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `subject_code`, `subject_name`, `credits`, `major_name`, `description`, `is_active`, `created_at`, `deleted_at`, `course_id`) VALUES
(1, 'INT101', 'Nhập môn lập trình', 3, 'Công nghệ thông tin', NULL, 1, '2026-11-19 14:31:02', NULL, 12),
(2, 'INT102', 'Cơ sở dữ liệu', 3, 'Công nghệ thông tin', NULL, 1, '2026-11-19 14:31:02', NULL, 2),
(3, 'INT103', 'Lập trình hướng đối tượng', 3, 'Công nghệ thông tin', NULL, 1, '2026-11-19 14:31:02', NULL, 5),
(4, 'ACC101', 'Nguyên lý kế toán', 3, 'Kế toán', NULL, 1, '2026-11-19 14:31:02', NULL, NULL),
(5, 'ENG101', 'Tiếng Anh cơ bản', 2, NULL, NULL, 1, '2026-11-19 14:31:02', NULL, NULL),
(6, 'INT104', 'Mạng máy tính', 3, 'Công nghệ thông tin', NULL, 1, '2026-11-19 15:14:09', NULL, 15),
(7, 'ACC102', 'Kế toán tài chính', 3, 'Kế toán', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(8, 'ACC103', 'Kiểm toán căn bản', 3, 'Kế toán', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(9, 'LNG101', 'Ngữ âm và âm vị học', 3, 'Ngôn ngữ', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(10, 'LNG102', 'Ngữ pháp tiếng Anh nâng cao', 3, 'Ngôn ngữ', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(11, 'LNG103', 'Dịch thuật cơ bản', 2, 'Ngôn ngữ', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(12, 'BUS101', 'Quản trị học', 3, 'Quản trị kinh doanh', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(13, 'BUS102', 'Marketing căn bản', 3, 'Quản trị kinh doanh', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(14, 'BUS103', 'Quản trị nhân lực', 3, 'Quản trị kinh doanh', NULL, 1, '2026-11-19 15:14:09', NULL, NULL),
(15, 'GEN101', 'Triết học Mác - Lênin', 3, NULL, NULL, 1, '2026-11-19 15:14:09', NULL, 9),
(16, 'GEN102', 'Kỹ năng mềm', 2, NULL, NULL, 1, '2026-11-19 15:14:09', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `substitute_teachings`
--

CREATE TABLE `substitute_teachings` (
  `id` bigint(20) NOT NULL,
  `section_id` bigint(20) NOT NULL,
  `main_employee_id` bigint(20) DEFAULT NULL,
  `substitute_employee_id` bigint(20) NOT NULL,
  `teaching_date` date NOT NULL,
  `status` enum('assigned','completed') NOT NULL DEFAULT 'assigned',
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `substitute_teachings`
--

INSERT INTO `substitute_teachings` (`id`, `section_id`, `main_employee_id`, `substitute_employee_id`, `teaching_date`, `status`, `note`, `created_at`) VALUES
(1, 25, NULL, 1, '2026-11-26', 'assigned', NULL, '2026-11-26 15:21:11');

-- --------------------------------------------------------

--
-- Table structure for table `terms`
--

CREATE TABLE `terms` (
  `id` bigint(20) NOT NULL,
  `term_code` varchar(20) NOT NULL,
  `term_name` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `registration_open` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `terms`
--

INSERT INTO `terms` (`id`, `term_code`, `term_name`, `start_date`, `end_date`, `is_current`, `registration_open`, `created_at`) VALUES
(1, '2025-2', 'Học kỳ 2 năm học 2025-2026', '2026-02-01', '2026-06-15', 0, 0, '2026-11-19 14:31:02'),
(2, '2026-1', 'Học kỳ 1 năm học 2026-2027', '2026-09-01', '2027-01-15', 1, 1, '2026-11-19 14:31:02');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(30) NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `full_name` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `ref_code` varchar(50) DEFAULT NULL,
  `reset_token_hash` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `is_active`, `created_at`, `full_name`, `email`, `ref_code`, `reset_token_hash`, `reset_token_expires`) VALUES
(1, 'admin', '$2b$10$XVLhrNgjlSs4tu8eGeiRv.qA9KuXHgvgJA5RRwSGGwi7QyIFLaIFG', 'admin', 1, '2026-11-24 15:52:07', 'Quản trị hệ thống', NULL, NULL, NULL, NULL),
(2, 'SV2024001', '$2b$10$kKZsWNNdqBW.5/q.Bfdydu8Oef6v3DyVgZZPUYBWXFrmDw1AIc5pm', 'student', 1, '2026-11-25 13:41:20', 'Nguyễn Văn An', 'an.nguyen@example.com', 'SV2024001', NULL, NULL),
(3, 'SV2026002', '$2b$10$2w6/18E2ZKxH3XgwDwNi7OHoO2Ogcvjew.0Sx1lLhr9FduO05DV0a', 'student', 1, '2026-11-25 13:41:20', 'Hồ Ngọc Cẩm Đào', 'dao@gmail.com', 'SV2026002', NULL, NULL),
(4, 'SV2026003', '$2b$10$TLE1AcoSt29Y6rpcqdydf.vXP0jsKoQcN1ZPPLjKohbSpFRoByGBe', 'student', 1, '2026-11-25 13:41:20', 'Phạm Thanh Trang', 'trang@gmail.com', 'SV2026003', NULL, NULL),
(5, 'SV2026004', '$2b$10$Mtmhryt0Df2EFhxMoOzbsulC2i9cNfN7GlGu/Cj0iAHXEX49V8WeK', 'student', 1, '2026-11-25 13:41:20', 'Lê Hoàng Long', 'long.lh@example.com', 'SV2026004', NULL, NULL),
(6, 'SV2026005', '$2b$10$NxMpYjZqKtx.D.EhTaT9q.skcTLWWlp7CecTIla61mnzez8LS0XMm', 'student', 1, '2026-11-25 13:41:20', 'Phạm Thúy Nga', 'nga.pt@example.com', 'SV2026005', NULL, NULL),
(7, 'SV2026006', '$2b$10$EoG0e76w5OFWTuUiUbWvm.2sgu.buSdEVdzYtEIdhg9.mwudGk256', 'student', 1, '2026-11-25 13:41:20', 'Đỗ Minh Quân', 'quan.dm@example.com', 'SV2026006', NULL, NULL),
(8, 'SV2026007', '$2b$10$bW2tvbBpN/OPlnYmUgtwiOfpiDt9fCjI2sBGmzsiCDAGWaxOX6DJy', 'student', 1, '2026-11-25 13:41:20', 'Vũ Hải Yến', 'yen.vh@example.com', 'SV2026007', NULL, NULL),
(9, 'SV2026008', '$2b$10$VPW4nZMVPY/6AmYdJlLPReQwX8wbqh6AxJYqqagbMz8MhpeXFxkwu', 'student', 1, '2026-11-25 13:41:20', 'Nguyễn Minh Anh', 'anh.nm@example.com', 'SV2026008', NULL, NULL),
(10, 'SV2026009', '$2b$10$ErlQuIsFDR1G6b2GDOHw/.votCki4PMnQDI2LIGydnxGnia.hdUje', 'student', 1, '2026-11-25 13:41:20', 'Trần Hoàng Nam', 'nam.th@example.com', 'SV2026009', NULL, NULL),
(11, 'SV2026010', '$2b$10$VJzBIyMoA13BI5WOsV/VUuYy..zzQe18ARduG1z1mBrYClsyCTZO2', 'student', 1, '2026-11-25 13:41:20', 'Lê Ngọc Hà', 'ha.ln@example.com', 'SV2026010', NULL, NULL),
(12, 'SV2026011', '$2b$10$2TahMcQrKs2Heq8dB2K3auribv7cl5cYCqBqw5LNKG/Dg2Y8dA/7K', 'student', 1, '2026-11-25 13:41:20', 'Phạm Tuấn Kiệt', 'kiet.pt@example.com', 'SV2026011', NULL, NULL),
(13, 'SV2026012', '$2b$10$oIRwooOFycwu9Q1.B9WFy.sinJVJ1Fc2fIpwqoUIpW8DM99OHQj3q', 'student', 1, '2026-11-25 13:41:20', 'Võ Thị Thanh Mai', 'mai.vtt@example.com', 'SV2026012', NULL, NULL),
(14, 'SV2026013', '$2b$10$Za/bCG0LqfCdL4Lvw7Y8G.CHmisAlw1FktYj.oxX8TXxIC04aQGhe', 'student', 1, '2026-11-25 13:41:20', 'Đặng Quốc Bảo', 'bao.dq@example.com', 'SV2026013', NULL, NULL),
(15, 'SV2026014', '$2b$10$jEf22KPwRFzmh7getTw3de.45NSSiqBHdPq0pm1ilML1OELAFvFQK', 'student', 1, '2026-11-25 13:41:20', 'Bùi Khánh Linh', 'linh.bk@example.com', 'SV2026014', NULL, NULL),
(16, 'SV2026015', '$2b$10$GHcNIv8VMplXPdhkyruZwewqy/93/T3uxJtiSP0aQ2E6JRHcmc/F.', 'student', 1, '2026-11-25 13:41:20', 'Hoàng Đức Anh', 'anh.hd@example.com', 'SV2026015', NULL, NULL),
(17, 'SV2026016', '$2b$10$hVBEEhT2UafTmnFfsMxsvOUi.02cIOFbwkDp//X5FukoVmGJgHExa', 'student', 1, '2026-11-25 13:41:20', 'Ngô Phương Thảo', 'thao.np@example.com', 'SV2026016', NULL, NULL),
(18, 'SV2026017', '$2b$10$tgTOovIjOt2vb/k2CVcZKOcQDfcesPBlKON5Inanbso0iPEqFV/Mm', 'student', 1, '2026-11-25 13:41:20', 'Dương Gia Huy', 'huy.dg@example.com', 'SV2026017', NULL, NULL),
(19, 'SV2026018', '$2b$10$pSbJs5oDLC137LeQCUL.9ecNu2q4tINsEqSdxWTY6SJq6KDDwOU7y', 'student', 1, '2026-11-25 13:41:20', 'Phan Thành Đạt', 'dat.pt@example.com', 'SV2026018', NULL, NULL),
(20, 'SV2026019', '$2b$10$HsWG31kJokfXE2nu8U2RS.zczSYuXa40ooya54ah0jDWVMA/Hp/uy', 'student', 1, '2026-11-25 13:41:21', 'Đinh Gia Bảo', 'bao.dg@example.com', 'SV2026019', NULL, NULL),
(21, 'SV2026020', '$2b$10$dsQufLLiRVoNYhtgoLwJdOM2jU7I1Bgxn3gkNGhHUksrMTFfNzuoG', 'student', 1, '2026-11-25 13:41:21', 'Võ Minh Quân', 'quan.vm@example.com', 'SV2026020', NULL, NULL),
(22, 'SV2026021', '$2b$10$rD672.TTqk9/3bpVc2W5COPdjbS1y/ByVt91zOrFFmbayp1vcDEbO', 'student', 1, '2026-11-25 13:41:21', 'Đặng Thùy Trang', 'trang.dt@example.com', 'SV2026021', NULL, NULL),
(23, 'SV2026022', '$2b$10$RHneotnZZHZF/r51/DWEyOGOdT4sinTnzUGwq5xMF7LXiDDJ6Olam', 'student', 1, '2026-11-25 13:41:21', 'Đỗ Minh Nhật', 'nhat.dm@example.com', 'SV2026022', NULL, NULL),
(24, 'SV2026023', '$2b$10$KGuQdCb24mmGNMpPMYDyYeM2UBlfMjfWUVbfZpKsTE0uVTTyExqf2', 'student', 1, '2026-11-25 13:41:21', 'Lý Thu Hương', 'huong.lt@example.com', 'SV2026023', NULL, NULL),
(25, 'SV2026024', '$2b$10$SP0/q.ZZ./m4jRk0gqPKFOZKkhMyB/vDoxMIMlEuf7PDWMjFaIsVK', 'student', 1, '2026-11-25 13:41:21', 'Trương Quang Vinh', 'vinh.tq@example.com', 'SV2026024', NULL, NULL),
(26, 'SV2026025', '$2b$10$zSOtfngBD6OnVEkqvekDueJHukofbWZ6Hqk8NoDKw3bZeN332cI/K', 'student', 1, '2026-11-25 13:41:21', 'Huỳnh Bảo Ngọc', 'ngoc.hb@example.com', 'SV2026025', NULL, NULL),
(27, 'SV2026026', '$2b$10$tzxWswimM4COcOkJ/.vN/ewvd3mqmAraa78b6tKAlEqUztz5/BUWm', 'student', 1, '2026-11-25 13:41:21', 'Mai Xuân Trường', 'truong.mx@example.com', 'SV2026026', NULL, NULL),
(28, 'SV2026027', '$2b$10$w9fyWSZY9601sSyC0AeEK.G7ho9jLhMGqeOmmKjFxiE45tLsT3I3u', 'student', 1, '2026-11-25 13:41:21', 'Cao Diễm My', 'my.cd@example.com', 'SV2026027', NULL, NULL),
(29, 'SV2026028', '$2b$10$OFqBS3nM9OBNTiT8IHHvieSJmTxXVq.KBOBH/.Haf6Qm6esvNTJTK', 'student', 1, '2026-11-25 13:41:21', 'Tạ Nhật Minh', 'minh.tn@example.com', 'SV2026028', NULL, NULL),
(30, 'SV2026029', '$2b$10$70MtJYqC7sm7QKUqx1R/.OlcnBO/cF5.Pj3ONSz2OsHo0BXeu4AtS', 'student', 1, '2026-11-25 13:41:21', 'Lưu Hồng Nhung', 'nhung.lh@example.com', 'SV2026029', NULL, NULL),
(31, 'SV2026030', '$2b$10$zUNNhUnG8i2sb4jyX9m2ae/L2PrlCG/ps89kN8sZbquKT01tjsI3K', 'student', 1, '2026-11-25 13:41:21', 'Châu Đức Thịnh', 'thinh.cd@example.com', 'SV2026030', NULL, NULL),
(32, 'SV2026031', '$2b$10$9fKvYn0KXkejgcnMqkR2De.9TJ6emW8Tq2JyKLWy25UZixZr8VO/i', 'student', 1, '2026-11-25 13:41:21', 'Kiều Anh Thư', 'thu.ka@example.com', 'SV2026031', NULL, NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_student_current_status`
-- (See below for the actual view)
--
CREATE TABLE `v_student_current_status` (
`id` bigint(20)
,`student_id` bigint(20)
,`status` varchar(30)
,`reason` text
,`effective_date` date
,`created_by` bigint(20)
,`created_at` datetime
);

-- --------------------------------------------------------

--
-- Structure for view `v_student_current_status`
--
DROP TABLE IF EXISTS `v_student_current_status`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_student_current_status`  AS SELECT `ss`.`id` AS `id`, `ss`.`student_id` AS `student_id`, `ss`.`status` AS `status`, `ss`.`reason` AS `reason`, `ss`.`effective_date` AS `effective_date`, `ss`.`created_by` AS `created_by`, `ss`.`created_at` AS `created_at` FROM `student_status` AS `ss` WHERE `ss`.`id` = (select `s2`.`id` from `student_status` `s2` where `s2`.`student_id` = `ss`.`student_id` AND `s2`.`effective_date` <= curdate() order by `s2`.`effective_date` desc,`s2`.`id` desc limit 1) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `advisor_classe_sections`
--
ALTER TABLE `advisor_classe_sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_advisor_class_dates` (`student_class_id`,`start_date`,`end_date`),
  ADD KEY `idx_advisor_employee` (`employee_id`);

--
-- Indexes for table `attendances`
--
ALTER TABLE `attendances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_attendance_enrollment_date` (`enrollment_id`,`date`);

--
-- Indexes for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_att_session_section_number` (`section_id`,`number`),
  ADD UNIQUE KEY `uq_att_session_section_date` (`section_id`,`date`);

--
-- Indexes for table `class_sections`
--
ALTER TABLE `class_sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sections_code` (`section_code`),
  ADD KEY `idx_sections_subject` (`subject_id`),
  ADD KEY `idx_sections_term` (`term_id`),
  ADD KEY `idx_sections_employee` (`employee_id`),
  ADD KEY `idx_sections_deleted_at` (`deleted_at`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_courses_code` (`course_code`);

--
-- Indexes for table `course_prerequisites`
--
ALTER TABLE `course_prerequisites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_course_pre` (`course_id`,`prerequisite_id`),
  ADD KEY `fk_pre_pre` (`prerequisite_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_employees_code` (`employee_code`),
  ADD UNIQUE KEY `uq_employees_email` (`email`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_enrollment_student_section` (`student_id`,`section_id`),
  ADD KEY `idx_enrollment_section` (`section_id`);

--
-- Indexes for table `grades`
--
ALTER TABLE `grades`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_grades_enrollment` (`enrollment_id`),
  ADD KEY `fk_grades_user` (`updated_by`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_students_code` (`student_code`),
  ADD KEY `idx_students_class_id` (`class_id`),
  ADD KEY `idx_students_deleted_at` (`deleted_at`);

--
-- Indexes for table `student_classes`
--
ALTER TABLE `student_classes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_student_classes_code` (`class_code`);

--
-- Indexes for table `student_status`
--
ALTER TABLE `student_status`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_status_user` (`created_by`),
  ADD KEY `idx_status_student_date` (`student_id`,`effective_date`,`id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_subjects_code` (`subject_code`),
  ADD KEY `idx_subjects_deleted_at` (`deleted_at`),
  ADD KEY `fk_subjects_course` (`course_id`);

--
-- Indexes for table `substitute_teachings`
--
ALTER TABLE `substitute_teachings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sub_section_date_emp` (`section_id`,`teaching_date`,`substitute_employee_id`),
  ADD KEY `idx_sub_emp_date` (`substitute_employee_id`,`teaching_date`),
  ADD KEY `fk_sub_main` (`main_employee_id`);

--
-- Indexes for table `terms`
--
ALTER TABLE `terms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_terms_code` (`term_code`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `advisor_classe_sections`
--
ALTER TABLE `advisor_classe_sections`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `attendances`
--
ALTER TABLE `attendances`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `class_sections`
--
ALTER TABLE `class_sections`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `course_prerequisites`
--
ALTER TABLE `course_prerequisites`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=287;

--
-- AUTO_INCREMENT for table `grades`
--
ALTER TABLE `grades`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `student_classes`
--
ALTER TABLE `student_classes`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `student_status`
--
ALTER TABLE `student_status`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `substitute_teachings`
--
ALTER TABLE `substitute_teachings`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `terms`
--
ALTER TABLE `terms`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `advisor_classe_sections`
--
ALTER TABLE `advisor_classe_sections`
  ADD CONSTRAINT `fk_advisor_class` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_advisor_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `attendances`
--
ALTER TABLE `attendances`
  ADD CONSTRAINT `fk_attendance_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD CONSTRAINT `fk_att_session_section` FOREIGN KEY (`section_id`) REFERENCES `class_sections` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_sections`
--
ALTER TABLE `class_sections`
  ADD CONSTRAINT `fk_section_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_section_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_section_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `course_prerequisites`
--
ALTER TABLE `course_prerequisites`
  ADD CONSTRAINT `fk_pre_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pre_pre` FOREIGN KEY (`prerequisite_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollment_section` FOREIGN KEY (`section_id`) REFERENCES `class_sections` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_enrollment_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `grades`
--
ALTER TABLE `grades`
  ADD CONSTRAINT `fk_grades_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_grades_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) REFERENCES `student_classes` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `student_status`
--
ALTER TABLE `student_status`
  ADD CONSTRAINT `fk_status_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_status_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `fk_subjects_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `substitute_teachings`
--
ALTER TABLE `substitute_teachings`
  ADD CONSTRAINT `fk_sub_main` FOREIGN KEY (`main_employee_id`) REFERENCES `employees` (`id`),
  ADD CONSTRAINT `fk_sub_section` FOREIGN KEY (`section_id`) REFERENCES `class_sections` (`id`),
  ADD CONSTRAINT `fk_sub_sub` FOREIGN KEY (`substitute_employee_id`) REFERENCES `employees` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
