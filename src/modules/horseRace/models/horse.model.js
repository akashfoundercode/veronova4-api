const { pool } = require('../config/database');

class HorseModel {
    static async findAll(options = {}, db = pool) {
        const { status, orderBy = 'serial_number ASC' } = options;
        const params = [];
        const whereClauses = [];

        if (status && (status === 'active' || status === 'inactive')) {
            whereClauses.push('status = ?');
            params.push(status);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const allowedSorts = ['serial_number ASC', 'serial_number DESC', 'id ASC', 'id DESC', 'name ASC'];
        const sortSql = allowedSorts.includes(orderBy) ? orderBy : 'serial_number ASC';

        const [rows] = await db.query(
            `SELECT id, serial_number, name, image_url, status, created_at, updated_at
             FROM horses ${whereSql}
             ORDER BY ${sortSql}`,
            params
        );
        return rows;
    }

    static async findAllActive(db = pool) {
        return this.findAll({ status: 'active', orderBy: 'serial_number ASC' }, db);
    }

    static async findActiveHorses(db = pool) {
        return this.findAllActive(db);
    }

    static async findById(id, db = pool) {
        const [rows] = await db.execute(
            'SELECT id, serial_number, name, image_url, status, created_at, updated_at FROM horses WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    }

    static async findBySerialNumber(serialNumber, db = pool) {
        const [rows] = await db.execute(
            'SELECT id, serial_number, name, image_url, status, created_at, updated_at FROM horses WHERE serial_number = ? LIMIT 1',
            [serialNumber]
        );
        return rows[0] || null;
    }

    static async findBySerialNumberExcludeId(serialNumber, excludeId, db = pool) {
        const [rows] = await db.execute(
            'SELECT id, serial_number, name, image_url, status, created_at, updated_at FROM horses WHERE serial_number = ? AND id != ? LIMIT 1',
            [serialNumber, excludeId]
        );
        return rows[0] || null;
    }

    static async create({ serialNumber, name, imageUrl = null, status = 'active' }, db = pool) {
        const [result] = await db.execute(
            'INSERT INTO horses (serial_number, name, image_url, status) VALUES (?, ?, ?, ?)',
            [serialNumber, name, imageUrl || null, status]
        );
        return this.findById(result.insertId, db);
    }

    static async update(id, { serialNumber, name, imageUrl, status }, db = pool) {
        const updates = [];
        const params = [];

        if (serialNumber !== undefined) {
            updates.push('serial_number = ?');
            params.push(serialNumber);
        }
        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (imageUrl !== undefined) {
            updates.push('image_url = ?');
            params.push(imageUrl || null);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }

        if (updates.length === 0) return this.findById(id, db);

        params.push(id);
        await db.execute(
            `UPDATE horses SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        return this.findById(id, db);
    }

    static async delete(id, db = pool) {
        const horse = await this.findById(id, db);
        if (!horse) return null;

        await db.execute('DELETE FROM horses WHERE id = ?', [id]);
        return horse;
    }
}

module.exports = HorseModel;
