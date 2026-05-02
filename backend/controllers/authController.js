const { query } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Check if user exists
    const userExists = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, role || 'sportsman']
    );

    res.json({ success: true, user: newUser.rows[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await query('SELECT id, username, role, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { register, login, getMe };
