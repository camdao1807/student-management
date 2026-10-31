-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 29, 2026 at 09:15 AM
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
) ;

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
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` bigint(20) NOT NULL,
  `employee_code` varchar(30) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ;

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
  `deleted_at` datetime DEFAULT NULL
) ;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `student_code`, `full_name`, `date_of_birth`, `gender`, `email`, `phone`, `class_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'SV2024001', 'Nguyễn Văn An', '2005-03-15', 'male', 'an.nguyen@example.com', '0901234567', 1, '2026-10-29 15:08:20', '2026-10-29 15:08:20', NULL);

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
(1, 'CNTT01', 'Công nghệ thông tin 01', 'Công nghệ thông tin', '2024-2028', 1, '2026-10-29 14:36:32');

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
) ;

--
-- Dumping data for table `student_status`
--

INSERT INTO `student_status` (`id`, `student_id`, `status`, `reason`, `effective_date`, `created_by`, `created_at`) VALUES
(1, 1, 'studying', 'Nhập học', '2026-10-29', NULL, '2026-10-29 15:08:20');

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
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

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
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_employees_code` (`employee_code`),
  ADD UNIQUE KEY `uq_employees_email` (`email`);

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
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_classes`
--
ALTER TABLE `student_classes`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `student_status`
--
ALTER TABLE `student_status`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
