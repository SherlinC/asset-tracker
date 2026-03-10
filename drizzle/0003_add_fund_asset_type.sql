-- Add 'fund' to asset type enum (中国基金/天天基金)
ALTER TABLE `assets` MODIFY COLUMN `type` enum('currency','crypto','stock','fund') NOT NULL;
