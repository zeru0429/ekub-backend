/*
  Warnings:

  - You are about to drop the column `toatal` on the `Category` table. All the data in the column will be lost.
  - Added the required column `total` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Category` DROP COLUMN `toatal`,
    ADD COLUMN `total` DECIMAL(65, 30) NOT NULL;
