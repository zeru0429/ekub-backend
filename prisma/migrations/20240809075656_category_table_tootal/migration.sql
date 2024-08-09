/*
  Warnings:

  - Added the required column `toatal` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Category` ADD COLUMN `toatal` DECIMAL(65, 30) NOT NULL;
