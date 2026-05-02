const { query } = require('../db');

const getUsers = async (req, res) => {
  try {
    const result = await query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, users: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'manager', 'sportsman'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion if needed, but let's keep it simple
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { getUsers, updateUserRole, deleteUser };
