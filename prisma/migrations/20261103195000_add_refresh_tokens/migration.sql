CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `family_id` CHAR(36) NOT NULL,
    `fk_user_id` VARCHAR(191) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_family_id_revoked_at_idx`(`family_id`, `revoked_at`),
    INDEX `refresh_tokens_fk_user_id_revoked_at_idx`(`fk_user_id`, `revoked_at`),
    INDEX `refresh_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `refresh_tokens`
    ADD CONSTRAINT `refresh_tokens_fk_user_id_fkey`
    FOREIGN KEY (`fk_user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
