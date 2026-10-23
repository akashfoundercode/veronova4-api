const HorseService = require('../services/horse.service');

async function getAllHorses(request, response, next) {
    try {
        const horses = await HorseService.getAllHorses(request.query);
        return response.json({
            success: true,
            total: horses.length,
            horses,
        });
    } catch (error) {
        return next(error);
    }
}

async function getHorseById(request, response, next) {
    try {
        const { id } = request.params;
        const horse = await HorseService.getHorseById(id);
        return response.json({
            success: true,
            horse,
        });
    } catch (error) {
        return next(error);
    }
}

async function createHorse(request, response, next) {
    try {
        const payload = { ...(request.body || {}) };
        // If an image file was uploaded via multipart/form-data
        if (request.file) {
            payload.image_url = `/uploads/horses/${request.file.filename}`;
        }

        const horse = await HorseService.createHorse(payload);
        return response.status(201).json({
            success: true,
            message: `Horse #${horse.serialNumber} '${horse.name}' created successfully`,
            horse,
        });
    } catch (error) {
        return next(error);
    }
}

async function updateHorse(request, response, next) {
    try {
        const { id } = request.params;
        const payload = { ...(request.body || {}) };
        // If an image file was uploaded via multipart/form-data
        if (request.file) {
            payload.image_url = `/uploads/horses/${request.file.filename}`;
        }

        const horse = await HorseService.updateHorse(id, payload);
        return response.json({
            success: true,
            message: `Horse #${horse.serialNumber} '${horse.name}' updated successfully`,
            horse,
        });
    } catch (error) {
        return next(error);
    }
}

async function deleteHorse(request, response, next) {
    try {
        const { id } = request.params;
        const horse = await HorseService.deleteHorse(id);
        return response.json({
            success: true,
            message: `Horse #${horse.serialNumber} '${horse.name}' deleted successfully`,
            horse,
        });
    } catch (error) {
        return next(error);
    }
}

async function uploadImage(request, response, next) {
    try {
        if (!request.file) {
            return response.status(400).json({ success: false, message: 'Please select an image file to upload' });
        }
        const protocol = request.protocol;
        const host = request.get('host');
        const relativeUrl = `/uploads/horses/${request.file.filename}`;
        const fullUrl = `${protocol}://${host}${relativeUrl}`;

        return response.status(200).json({
            success: true,
            message: 'Horse image uploaded successfully',
            filename: request.file.filename,
            imageUrl: relativeUrl,
            fullUrl,
        });
    } catch (error) {
        return next(error);
    }
}

async function updateHorseImage(request, response, next) {
    try {
        const { id } = request.params;
        if (!request.file) {
            return response.status(400).json({ success: false, message: 'Please select an image file to upload' });
        }
        const fileUrl = `/uploads/horses/${request.file.filename}`;
        const horse = await HorseService.updateHorse(id, { image_url: fileUrl });
        return response.json({
            success: true,
            message: `Image updated successfully for Horse #${horse.serialNumber} '${horse.name}'`,
            imageUrl: fileUrl,
            horse,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getAllHorses,
    getHorseById,
    createHorse,
    updateHorse,
    deleteHorse,
    uploadImage,
    updateHorseImage,
};
