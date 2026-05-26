import { v2 as cloudinary } from 'cloudinary';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure Cloudinary
const configureCloudinary = () => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('Cloudinary environment variables are not properly configured for cleanup job');
        return false;
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return true;
};

/**
 * Delete images from a specific folder in Cloudinary that are older than a certain number of days
 * @param {string} folder - The folder name in Cloudinary
 * @param {number} days - Number of days
 */
const deleteOldImagesFromCloudinary = async (folder, days) => {
    try {
        console.log(`[Cleanup Job] Starting cleanup for folder: ${folder}, older than ${days} days`);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Use Cloudinary search API to find old resources
        // Note: Search API might require special setup, alternative is api.resources
        // Let's use api.resources with prefix and type

        let nextCursor = null;
        let deletedCount = 0;

        do {
            const result = await cloudinary.api.resources({
                type: 'upload',
                prefix: folder,
                max_results: 100,
                next_cursor: nextCursor
            });

            const resourcesToDelete = result.resources.filter(resource => {
                const createdAt = new Date(resource.created_at);
                return createdAt < cutoffDate;
            });

            if (resourcesToDelete.length > 0) {
                const publicIds = resourcesToDelete.map(r => r.public_id);
                console.log(`[Cleanup Job] Deleting ${publicIds.length} images from ${folder}...`);

                await cloudinary.api.delete_resources(publicIds);
                deletedCount += publicIds.length;
            }

            nextCursor = result.next_cursor;
        } while (nextCursor);

        console.log(`[Cleanup Job] Successfully deleted ${deletedCount} images from ${folder}`);
        return deletedCount;
    } catch (error) {
        console.error(`[Cleanup Job] Error deleting images from Cloudinary folder ${folder}:`, error);
        return 0;
    }
};

/**
 * Cleanup orphaned local images in the uploads/punch-images directory
 * @param {number} days - Number of days
 */
const cleanupLocalImages = async (days) => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uploadDir = path.join(__dirname, "..", "uploads", "punch-images");

        if (!fs.existsSync(uploadDir)) {
            console.log(`[Cleanup Job] Local upload directory does not exist: ${uploadDir}`);
            return;
        }

        const files = fs.readdirSync(uploadDir);
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        let deletedCount = 0;

        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stats = fs.statSync(filePath);

            if (stats.mtimeMs < cutoffTime) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        }

        console.log(`[Cleanup Job] Successfully deleted ${deletedCount} local orphaned images`);
    } catch (error) {
        console.error(`[Cleanup Job] Error cleaning up local images:`, error);
    }
};

/**
 * Main cleanup function
 */
export const runCleanupJob = async () => {
    console.log('[Cleanup Job] Initializing image cleanup job...');

    if (!configureCloudinary()) return;

    // Delete folder-specific punch images (employee and contractor)
    await deleteOldImagesFromCloudinary('employee-punches', 6);
    await deleteOldImagesFromCloudinary('contractor-punches', 6);

    // Also cleanup local files older than 1 day (should be uploaded by then or failed)
    // We keep them for a bit longer just in case, but 6 days is the user's requirement for images.
    // Local files are usually deleted immediately after upload, so anything left is orphaned.
    await cleanupLocalImages(6);

    console.log('[Cleanup Job] Cleanup task completed');
};

// Schedule the job to run daily at 3:00 AM
export const initImageCleanupSchedule = () => {
    console.log('[Cleanup Job] Scheduling image cleanup job (Daily at 3:00 AM)');
    cron.schedule('0 3 * * *', async () => {
        await runCleanupJob();
    });
};
