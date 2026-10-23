const HorseModel = require('../models/horse.model');

class HorseService {
    static formatHorse(row) {
        if (!row) return null;
        return {
            id: Number(row.id),
            serialNumber: Number(row.serial_number),
            name: row.name,
            imageUrl: row.image_url || null,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    static validateSerialNumber(serialNumber) {
        const num = Number(serialNumber);
        if (!Number.isInteger(num) || num <= 0) {
            const error = new Error('serial_number must be a valid positive integer');
            error.statusCode = 400;
            throw error;
        }
        return num;
    }

    static validateName(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            const error = new Error('Horse name is required and cannot be empty');
            error.statusCode = 400;
            throw error;
        }
        return name.trim();
    }

    static validateStatus(status) {
        if (!status) return 'active';
        const normalized = String(status).toLowerCase().trim();
        if (!['active', 'inactive'].includes(normalized)) {
            const error = new Error('Status must be either "active" or "inactive"');
            error.statusCode = 400;
            throw error;
        }
        return normalized;
    }

    // Get all horses (defaults to active horses, ordered by serial_number ASC)
    static async getAllHorses(query = {}) {
        let statusFilter = 'active';
        if (query.status) {
            const requested = String(query.status).toLowerCase();
            if (requested === 'all') {
                statusFilter = undefined;
            } else if (requested === 'inactive') {
                statusFilter = 'inactive';
            } else if (requested === 'active') {
                statusFilter = 'active';
            }
        }

        const rows = await HorseModel.findAll({
            status: statusFilter,
            orderBy: 'serial_number ASC',
        });

        return rows.map((r) => this.formatHorse(r));
    }

    // Get horse by ID or Serial Number
    static async getHorseById(id) {
        let horse = await HorseModel.findById(id);
        if (!horse && !isNaN(Number(id))) {
            horse = await HorseModel.findBySerialNumber(Number(id));
        }

        if (!horse) {
            const error = new Error(`Horse not found with ID or Serial Number ${id}`);
            error.statusCode = 404;
            throw error;
        }

        return this.formatHorse(horse);
    }

    // Create a new horse
    static async createHorse(data = {}) {
        const serialNumber = this.validateSerialNumber(data.serialNumber ?? data.serial_number);
        const name = this.validateName(data.name);
        const status = this.validateStatus(data.status);
        const imageUrl = data.imageUrl || data.image_url || null;

        // Check if serial_number already exists
        const existing = await HorseModel.findBySerialNumber(serialNumber);
        if (existing) {
            const error = new Error(`Horse with serial_number ${serialNumber} already exists`);
            error.statusCode = 409;
            throw error;
        }

        const horse = await HorseModel.create({
            serialNumber,
            name,
            imageUrl,
            status,
        });

        return this.formatHorse(horse);
    }

    // Update existing horse (Supports ID or Serial Number lookup)
    static async updateHorse(id, data = {}) {
        let horse = await HorseModel.findById(id);
        if (!horse && !isNaN(Number(id))) {
            horse = await HorseModel.findBySerialNumber(Number(id));
        }

        if (!horse) {
            const error = new Error(`Horse with ID or Serial Number ${id} not found`);
            error.statusCode = 404;
            throw error;
        }

        const horseId = horse.id;
        const updateData = {};

        if (data.serialNumber !== undefined || data.serial_number !== undefined) {
            const newSerial = this.validateSerialNumber(data.serialNumber ?? data.serial_number);
            const duplicate = await HorseModel.findBySerialNumberExcludeId(newSerial, horseId);
            if (duplicate) {
                const error = new Error(`Horse with serial_number ${newSerial} already exists`);
                error.statusCode = 409;
                throw error;
            }
            updateData.serialNumber = newSerial;
        }

        if (data.name !== undefined) {
            updateData.name = this.validateName(data.name);
        }

        if (data.imageUrl !== undefined || data.image_url !== undefined) {
            updateData.imageUrl = (data.imageUrl || data.image_url || '').trim() || null;
        }

        if (data.status !== undefined) {
            updateData.status = this.validateStatus(data.status);
        }

        const updated = await HorseModel.update(horseId, updateData);
        return this.formatHorse(updated);
    }

    // Delete horse by ID or Serial Number
    static async deleteHorse(id) {
        let horse = await HorseModel.findById(id);
        if (!horse && !isNaN(Number(id))) {
            horse = await HorseModel.findBySerialNumber(Number(id));
        }

        if (!horse) {
            const error = new Error(`Horse with ID or Serial Number ${id} not found`);
            error.statusCode = 404;
            throw error;
        }

        await HorseModel.delete(horse.id);
        return this.formatHorse(horse);
    }
}

module.exports = HorseService;
