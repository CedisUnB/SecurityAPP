/*
  Warnings:

  - You are about to drop the column `command` on the `exercises` table. All the data in the column will be lost.
  - You are about to drop the column `fk_track_id` on the `exercises` table. All the data in the column will be lost.
  - You are about to drop the column `response` on the `exercises` table. All the data in the column will be lost.
  - You are about to alter the column `type` on the `exercises` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(1))`.
  - You are about to drop the column `fk_track_id` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `unlocked_revision` on the `takes` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `takes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(3))`.
  - You are about to drop the column `sequence` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the `review_contents` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fk_track_node_id]` on the table `lessons` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fk_track_node_id` to the `exercises` table without a default value. This is not possible if the table is not empty.
  - Added the required column `json` to the `exercises` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fk_track_node_id` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `json` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `exercises` DROP FOREIGN KEY `exercises_fk_track_id_fkey`;

-- DropForeignKey
ALTER TABLE `lessons` DROP FOREIGN KEY `lessons_fk_track_id_fkey`;

-- DropForeignKey
ALTER TABLE `review_contents` DROP FOREIGN KEY `review_contents_fk_track_id_fkey`;

-- DropIndex
DROP INDEX `exercises_fk_track_id_fkey` ON `exercises`;

-- DropIndex
DROP INDEX `lessons_fk_track_id_fkey` ON `lessons`;

-- AlterTable
ALTER TABLE `exercises` DROP COLUMN `command`,
    DROP COLUMN `fk_track_id`,
    DROP COLUMN `response`,
    ADD COLUMN `fk_track_node_id` INTEGER NOT NULL,
    ADD COLUMN `json` JSON NOT NULL,
    MODIFY `type` ENUM('revision', 'test') NOT NULL DEFAULT 'revision';

-- AlterTable
ALTER TABLE `lessons` DROP COLUMN `fk_track_id`,
    DROP COLUMN `text`,
    ADD COLUMN `fk_track_node_id` INTEGER NOT NULL,
    ADD COLUMN `json` JSON NOT NULL;

-- AlterTable
ALTER TABLE `takes` DROP COLUMN `unlocked_revision`,
    MODIFY `status` ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started';

-- AlterTable
ALTER TABLE `tracks` DROP COLUMN `sequence`;

-- DropTable
DROP TABLE `review_contents`;

-- CreateTable
CREATE TABLE `track_nodes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fk_track_id` INTEGER NOT NULL,
    `node_type` ENUM('lesson', 'exercise') NOT NULL,
    `order_index` INTEGER NOT NULL,

    INDEX `tracknode_fk_track_id_fkey`(`fk_track_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `progress` (
    `fk_user_id` VARCHAR(191) NOT NULL,
    `fk_track_node_id` INTEGER NOT NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `score` INTEGER NOT NULL DEFAULT 0,
    `attempts_count` INTEGER NOT NULL DEFAULT 0,
    `completed_at` DATETIME(3) NULL,
    `unlocked_at` DATETIME(3) NULL,

    INDEX `progress_fk_user_id_fkey`(`fk_user_id`),
    INDEX `progress_fk_track_node_id_fkey`(`fk_track_node_id`),
    PRIMARY KEY (`fk_user_id`, `fk_track_node_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exercises_fk_track_node_id_fkey` ON `exercises`(`fk_track_node_id`);

-- CreateIndex
CREATE UNIQUE INDEX `lessons_fk_track_node_id_key` ON `lessons`(`fk_track_node_id`);

-- CreateIndex
CREATE INDEX `lessons_fk_track_node_id_fkey` ON `lessons`(`fk_track_node_id`);

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_fk_track_node_id_fkey` FOREIGN KEY (`fk_track_node_id`) REFERENCES `track_nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_fk_track_node_id_fkey` FOREIGN KEY (`fk_track_node_id`) REFERENCES `track_nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `track_nodes` ADD CONSTRAINT `track_nodes_fk_track_id_fkey` FOREIGN KEY (`fk_track_id`) REFERENCES `tracks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progress` ADD CONSTRAINT `progress_fk_user_id_fkey` FOREIGN KEY (`fk_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progress` ADD CONSTRAINT `progress_fk_track_node_id_fkey` FOREIGN KEY (`fk_track_node_id`) REFERENCES `track_nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
