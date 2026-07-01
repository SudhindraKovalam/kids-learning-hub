import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';
import { seedQuestions } from './seedData.js';

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Initialize DB and Seed on startup
let db;
try {
  db = await getDb();
  await seedQuestions(db);
} catch (error) {
  console.error('Failed to initialize database:', error);
}

// 1. Profiles API
// GET all profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await db.all('SELECT * FROM profiles ORDER BY name ASC');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create profile
app.post('/api/profiles', async (req, res) => {
  const { name, avatar } = req.body;
  if (!name || !avatar) {
    return res.status(400).json({ error: 'Name and avatar are required.' });
  }
  try {
    const result = await db.run(
      'INSERT INTO profiles (name, avatar) VALUES (?, ?)',
      name.trim(),
      avatar
    );
    res.status(201).json({ id: result.lastID, name: name.trim(), avatar });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A profile with this name already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE profile
app.delete('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM profiles WHERE id = ?', id);
    res.json({ message: 'Profile deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for fraction math
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}
function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

// 2. Math Quiz Generator API
app.get('/api/quizzes/math', (req, res) => {
  const count = parseInt(req.query.count) || 30; // default to 30
  const type = req.query.type || 'mix'; // 'addition', 'subtraction', 'multiplication', 'division', 'fractions', 'mix'
  const problems = [];

  for (let i = 0; i < count; i++) {
    let currentOp = type;
    if (type === 'mix') {
      const ops = ['addition', 'subtraction', 'multiplication', 'division', 'fractions'];
      currentOp = ops[Math.floor(Math.random() * ops.length)];
    }

    let problem = { id: i + 1, type: currentOp };
    let format = 'standard'; // default format

    if (currentOp === 'addition') {
      const num1 = Math.floor(Math.random() * 90) + 10;
      const num2 = Math.floor(Math.random() * 90) + 10;
      problem.num1 = num1;
      problem.num2 = num2;
      problem.answer = num1 + num2;
      
      format = ['standard', 'missing_op1', 'missing_op2'][Math.floor(Math.random() * 3)];
    } else if (currentOp === 'subtraction') {
      const num1 = Math.floor(Math.random() * 90) + 10;
      const num2 = Math.floor(Math.random() * (num1 - 9)) + 10;
      problem.num1 = num1;
      problem.num2 = num2;
      problem.answer = num1 - num2;
      
      format = ['standard', 'missing_op1', 'missing_op2'][Math.floor(Math.random() * 3)];
    } else if (currentOp === 'multiplication') {
      if (Math.random() < 0.5) {
        const num1 = Math.floor(Math.random() * 90) + 10;
        const num2 = Math.floor(Math.random() * 8) + 2;
        problem.num1 = num1;
        problem.num2 = num2;
        problem.answer = num1 * num2;
      } else {
        const num1 = Math.floor(Math.random() * 40) + 10;
        const num2 = Math.floor(Math.random() * 20) + 10;
        problem.num1 = num1;
        problem.num2 = num2;
        problem.answer = num1 * num2;
      }
      format = ['standard', 'missing_op1', 'missing_op2'][Math.floor(Math.random() * 3)];
    } else if (currentOp === 'division') {
      const divisor = Math.floor(Math.random() * 11) + 2; // 2 to 12
      const quotient = Math.floor(Math.random() * 21) + 5; // 5 to 25
      const remainder = Math.floor(Math.random() * divisor); // 0 to divisor - 1
      const dividend = divisor * quotient + remainder;
      
      problem.num1 = dividend;
      problem.num2 = divisor;
      problem.answer = quotient;
      problem.remainder = remainder;
      
      // If remainder is 0, we can support missing operands format
      if (remainder === 0) {
        format = ['standard', 'missing_op1', 'missing_op2'][Math.floor(Math.random() * 3)];
      }
    } else if (currentOp === 'fractions') {
      let D1, D2;
      if (Math.random() < 0.5) {
        D1 = D2 = [3, 4, 5, 6, 8, 10, 12][Math.floor(Math.random() * 7)];
      } else {
        const pairs = [
          [2, 3], [2, 4], [2, 5], [2, 6], [2, 8], [2, 10],
          [3, 4], [3, 6], [3, 9], [4, 6], [4, 8], [5, 10]
        ];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        if (Math.random() < 0.5) {
          D1 = pair[0];
          D2 = pair[1];
        } else {
          D1 = pair[1];
          D2 = pair[0];
        }
      }

      const fractionOp = Math.random() < 0.5 ? '+' : '-';
      let N1 = Math.floor(Math.random() * (2 * D1 - 1)) + 1;
      let N2 = Math.floor(Math.random() * (2 * D2 - 1)) + 1;

      if (fractionOp === '-') {
        if (N1 / D1 < N2 / D2) {
          const tempN = N1; const tempD = D1;
          N1 = N2; D1 = D2;
          N2 = tempN; D2 = tempD;
        } else if (N1 / D1 === N2 / D2) {
          N1 += 1;
        }
      }

      const D_ans = lcm(D1, D2);
      let N_ans;
      if (fractionOp === '+') {
        N_ans = (N1 * (D_ans / D1)) + (N2 * (D_ans / D2));
      } else {
        N_ans = (N1 * (D_ans / D1)) - (N2 * (D_ans / D2));
      }

      problem.fractionOp = fractionOp;
      problem.num1 = N1;
      problem.den1 = D1;
      problem.num2 = N2;
      problem.den2 = D2;
      problem.answer = `${N_ans}/${D_ans}`;
      problem.decimalAnswer = N_ans / D_ans;
    }

    problem.format = format;
    if (format === 'standard') {
      problem.expectedAnswer = problem.answer;
    } else if (format === 'missing_op1') {
      problem.expectedAnswer = problem.num1;
    } else if (format === 'missing_op2') {
      problem.expectedAnswer = problem.num2;
    }

    problems.push(problem);
  }

  res.json(problems);
});

// 3. Science & Literacy Quiz API
app.get('/api/quizzes/questions', async (req, res) => {
  const { subject } = req.query;
  if (!subject || (subject !== 'science' && subject !== 'literacy')) {
    return res.status(400).json({ error: 'Valid subject (science or literacy) is required.' });
  }
  try {
    const qList = await db.all(
      'SELECT * FROM science_literacy_questions WHERE subject = ? ORDER BY RANDOM() LIMIT 10',
      subject
    );
    res.json(qList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Save Quiz/Workbook Results
app.post('/api/quizzes/complete', async (req, res) => {
  const { profileId, subject, score, totalQuestions, timeSpent } = req.body;
  if (!profileId || !subject || score === undefined || !totalQuestions || timeSpent === undefined) {
    return res.status(400).json({ error: 'Missing completion details.' });
  }
  try {
    await db.run(
      'INSERT INTO quiz_history (profile_id, subject, score, total_questions, time_spent) VALUES (?, ?, ?, ?, ?)',
      profileId,
      subject,
      score,
      totalQuestions,
      timeSpent
    );
    
    // Clear active session upon completion
    await db.run(
      'DELETE FROM active_sessions WHERE profile_id = ? AND subject = ?',
      profileId,
      subject
    );
    
    res.json({ message: 'Result recorded successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Active Sessions API
// GET active session
app.get('/api/sessions/:profileId/:subject', async (req, res) => {
  const { profileId, subject } = req.params;
  try {
    const session = await db.get(
      'SELECT * FROM active_sessions WHERE profile_id = ? AND subject = ?',
      profileId,
      subject
    );
    if (session) {
      res.json(JSON.parse(session.state));
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST save active session
app.post('/api/sessions', async (req, res) => {
  const { profileId, subject, state } = req.body;
  if (!profileId || !subject || !state) {
    return res.status(400).json({ error: 'profileId, subject, and state are required.' });
  }
  try {
    const stateString = JSON.stringify(state);
    
    // Insert or replace session
    await db.run(
      `INSERT OR REPLACE INTO active_sessions (profile_id, subject, state, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      profileId,
      subject,
      stateString
    );
    
    res.json({ message: 'Session saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE active session
app.delete('/api/sessions/:profileId/:subject', async (req, res) => {
  const { profileId, subject } = req.params;
  try {
    await db.run(
      'DELETE FROM active_sessions WHERE profile_id = ? AND subject = ?',
      profileId,
      subject
    );
    res.json({ message: 'Session deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Profiles Stats API
app.get('/api/profiles/:id/stats', async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await db.get('SELECT * FROM profiles WHERE id = ?', id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    
    const history = await db.all(
      'SELECT * FROM quiz_history WHERE profile_id = ? ORDER BY completed_at DESC',
      id
    );
    
    const activeSessions = await db.all(
      'SELECT subject, updated_at FROM active_sessions WHERE profile_id = ?',
      id
    );
    
    // Calculate statistics
    const stats = {
      math: { completed: 0, totalQuestions: 0, totalCorrect: 0, avgAccuracy: 0 },
      science: { completed: 0, totalQuestions: 0, totalCorrect: 0, avgAccuracy: 0 },
      literacy: { completed: 0, totalQuestions: 0, totalCorrect: 0, avgAccuracy: 0 }
    };
    
    let totalStars = 0;
    
    history.forEach(item => {
      const sub = item.subject;
      if (stats[sub]) {
        stats[sub].completed += 1;
        stats[sub].totalQuestions += item.total_questions;
        stats[sub].totalCorrect += item.score;
      }
      totalStars += item.score; // 1 star per correct answer
    });
    
    // Calculate accuracy percentage
    ['math', 'science', 'literacy'].forEach(sub => {
      if (stats[sub].totalQuestions > 0) {
        stats[sub].avgAccuracy = Math.round((stats[sub].totalCorrect / stats[sub].totalQuestions) * 100);
      }
    });
    
    res.json({
      profile,
      history,
      stats,
      totalStars,
      activeSessions: activeSessions.map(s => s.subject)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Assignments API
// GET all assignments for a profile
app.get('/api/assignments/:profileId', async (req, res) => {
  const { profileId } = req.params;
  try {
    const list = await db.all(
      'SELECT * FROM assigned_workbooks WHERE profile_id = ? ORDER BY assigned_at DESC',
      profileId
    );
    // Parse config and state JSON strings before sending to client
    const parsed = list.map(item => ({
      ...item,
      config: JSON.parse(item.config),
      state: item.state ? JSON.parse(item.state) : null
    }));
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST assign a workbook
app.post('/api/assignments', async (req, res) => {
  const { profileId, subject, config } = req.body;
  if (!profileId || !subject || !config) {
    return res.status(400).json({ error: 'Missing assignment details.' });
  }
  try {
    const result = await db.run(
      'INSERT INTO assigned_workbooks (profile_id, subject, config, status) VALUES (?, ?, ?, ?)',
      profileId,
      subject,
      JSON.stringify(config),
      'assigned'
    );
    res.status(201).json({
      id: result.lastID,
      profile_id: profileId,
      subject,
      config,
      status: 'assigned',
      assigned_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE assignment
app.delete('/api/assignments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM assigned_workbooks WHERE id = ?', id);
    res.json({ message: 'Assignment deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST save assignment active state
app.post('/api/assignments/:id/state', async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'State is required.' });
  }
  try {
    await db.run(
      `UPDATE assigned_workbooks 
       SET state = ?, status = 'in_progress' 
       WHERE id = ?`,
      JSON.stringify(state),
      id
    );
    res.json({ message: 'Assignment state saved.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST complete assignment
app.post('/api/assignments/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { score, totalQuestions, timeSpent } = req.body;
  if (score === undefined || !totalQuestions || timeSpent === undefined) {
    return res.status(400).json({ error: 'Missing completion details.' });
  }
  try {
    // 1. Get assignment details to write history record
    const assignment = await db.get('SELECT * FROM assigned_workbooks WHERE id = ?', id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // 2. Update assignment status to completed
    await db.run(
      `UPDATE assigned_workbooks 
       SET status = 'completed', score = ?, total_questions = ?, time_spent = ?, state = NULL, completed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      score,
      totalQuestions,
      timeSpent,
      id
    );

    // 3. Write record to general quiz_history so it integrates with existing stats
    await db.run(
      'INSERT INTO quiz_history (profile_id, subject, score, total_questions, time_spent) VALUES (?, ?, ?, ?, ?)',
      assignment.profile_id,
      assignment.subject,
      score,
      totalQuestions,
      timeSpent
    );

    res.json({ message: 'Assignment marked as completed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Parent PIN & Word Problems API
// POST verify parent pin
app.post('/api/parent/verify', async (req, res) => {
  const { pin } = req.body;
  try {
    const config = await db.get("SELECT value FROM system_config WHERE key = 'parent_pin'");
    const storedPin = config ? config.value : '0000';
    if (pin === storedPin) {
      res.json({ verified: true });
    } else {
      res.json({ verified: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST change parent pin
app.post('/api/parent/pin', async (req, res) => {
  const { newPin } = req.body;
  if (!newPin || !/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'PIN must be a 4-digit number.' });
  }
  try {
    await db.run(
      "INSERT OR REPLACE INTO system_config (key, value) VALUES ('parent_pin', ?)",
      newPin
    );
    res.json({ message: 'Parent PIN changed successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET math word problems
app.get('/api/quizzes/word-problems', async (req, res) => {
  const count = parseInt(req.query.count) || 5;
  try {
    const list = await db.all(
      'SELECT * FROM math_word_problems ORDER BY RANDOM() LIMIT ?',
      count
    );

    const processed = list.map(item => {
      const correctVal = parseInt(item.answer);
      if (isNaN(correctVal)) {
        return {
          ...item,
          option_a: item.answer,
          option_b: 'None of the above',
          option_c: 'Cannot be determined',
          option_d: '0',
          correct_option: 'A'
        };
      }

      // Generate 3 unique positive distractor values
      const offsets = [-10, 10, -5, 5, -20, 20, -100, 100, -2, 2, -1, 1];
      const distractors = new Set();
      let iterations = 0;
      while (distractors.size < 3 && iterations < 50) {
        iterations++;
        const offset = offsets[Math.floor(Math.random() * offsets.length)];
        const candidate = correctVal + offset;
        if (candidate > 0 && candidate !== correctVal) {
          distractors.add(candidate);
        }
      }

      // Fallback in case of generation loop timeout
      while (distractors.size < 3) {
        distractors.add(correctVal + distractors.size + 1);
      }

      const choices = [correctVal, ...Array.from(distractors)];
      // Shuffle choices
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = choices[i];
        choices[i] = choices[j];
        choices[j] = temp;
      }

      const letters = ['A', 'B', 'C', 'D'];
      const correctIdx = choices.indexOf(correctVal);

      return {
        ...item,
        option_a: choices[0].toString(),
        option_b: choices[1].toString(),
        option_c: choices[2].toString(),
        option_d: choices[3].toString(),
        correct_option: letters[correctIdx]
      };
    });

    res.json(processed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
