-- AlterTable
ALTER TABLE `RagDocument` ADD COLUMN `content` LONGTEXT NULL,
    ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true;
