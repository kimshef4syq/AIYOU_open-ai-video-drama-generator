/**
 * 节点 CRUD API
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/index.js';

const router = Router();

// POST /api/nodes - 创建节点
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { project_id, type, title, x, y, width, height, data, inputs } = req.body;
    const id = req.body.id || uuidv4();
    const [node] = await db('nodes').insert({
      id, project_id, type, title: title || '',
      x: x || 0, y: y || 0,
      width: width || 420, height: height || 360,
      status: 'IDLE',
      data: JSON.stringify(data || {}),
      inputs: JSON.stringify(inputs || []),
    }).returning('*');
    res.json({ success: true, data: node });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/nodes/:id - 更新节点
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updates = { updated_at: new Date() };
    const allowed = ['type', 'title', 'x', 'y', 'width', 'height', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.data !== undefined) updates.data = JSON.stringify(req.body.data);
    if (req.body.inputs !== undefined) updates.inputs = JSON.stringify(req.body.inputs);
    const [node] = await db('nodes').where({ id }).update(updates).returning('*');
    if (!node) return res.status(404).json({ success: false, error: '节点不存在' });
    res.json({ success: true, data: node });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/nodes/batch/update - 批量更新节点（用于拖拽后保存位置）
router.put('/batch/update', async (req, res) => {
  try {
    const db = getDB();
    const { nodes } = req.body; // Array of { id, x, y, width, height, ... }
    if (!Array.isArray(nodes)) return res.status(400).json({ success: false, error: '需要 nodes 数组' });

    await db.transaction(async (trx) => {
      for (const node of nodes) {
        const { id, ...updates } = node;
        if (updates.data) updates.data = JSON.stringify(updates.data);
        updates.updated_at = new Date();
        await trx('nodes').where({ id }).update(updates);
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/nodes/:id - 删除节点
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const deleted = await db('nodes').where({ id }).del();
    if (!deleted) return res.status(404).json({ success: false, error: '节点不存在' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
