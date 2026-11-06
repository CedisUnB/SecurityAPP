/*
  Warnings:

  - The primary key for the `answers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `fk_user_email` on the `answers` table. All the data in the column will be lost.
  - The primary key for the `takes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `fk_user_email` on the `takes` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fk_user_id` to the `answers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fk_user_id` to the `takes` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE `answers` DROP FOREIGN KEY `answers_fk_user_email_fkey`;

-- DropForeignKey
ALTER TABLE `takes` DROP FOREIGN KEY `takes_fk_user_email_fkey`;

-- DropIndex
DROP INDEX `answers_fk_user_email_fkey` ON `answers`;

-- AlterTable
ALTER TABLE `answers` DROP PRIMARY KEY,
    DROP COLUMN `fk_user_email`,
    ADD COLUMN `fk_user_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`fk_exercise_id`, `fk_user_id`);

-- AlterTable
ALTER TABLE `takes` DROP PRIMARY KEY,
    DROP COLUMN `fk_user_email`,
    ADD COLUMN `fk_user_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`fk_user_id`, `fk_track_id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    ADD COLUMN `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE INDEX `answers_fk_user_id_fkey` ON `answers`(`fk_user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);

-- AddForeignKey
ALTER TABLE `takes` ADD CONSTRAINT `takes_fk_user_id_fkey` FOREIGN KEY (`fk_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `answers` ADD CONSTRAINT `answers_fk_user_id_fkey` FOREIGN KEY (`fk_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
