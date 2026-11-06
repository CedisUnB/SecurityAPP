-- CreateTable
CREATE TABLE `login_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_hash` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL,

    INDEX `login_attempts_email_hash_created_at_idx`(`email_hash`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
