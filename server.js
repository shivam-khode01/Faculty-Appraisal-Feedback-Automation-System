const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const { appendToSheet } = require('./googleSheet');
const cors = require('cors');  // optional, if you want CORS enabled
const { generateFeedback } = require('./huggingFaceFeedback');
const DepartmentFeedback = require('./models/DepartmentFeedback'); // Import the DepartmentFeedback model
const dedent = require('dedent'); // Import separately as default
const natural = require('natural');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/appraisalDB';

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});


function extractKeywords(feedbackText) {
  const strengthKeywords = [];
  const weaknessKeywords = [];

  const strengthRegex = /Key Strengths:\s*((?:- .+\n?)+)/i;
  const weaknessRegex = /Areas of Improvement:\s*((?:- .+\n?)+)/i;

  const matchStrength = feedbackText.match(strengthRegex);
  const matchWeakness = feedbackText.match(weaknessRegex);

  if (matchStrength) {
    matchStrength[1].split('\n').forEach(line => {
      const word = line.replace(/^- /, '').trim();
      if (word) strengthKeywords.push(word);
    });
  }

  if (matchWeakness) {
    matchWeakness[1].split('\n').forEach(line => {
      const word = line.replace(/^- /, '').trim();
      if (word) weaknessKeywords.push(word);
    });
  }

  return { strengthKeywords, weaknessKeywords };
}

// Auto-rating calculation (0 to 100)
const calculateScore = (profile) => {
  const weights = {
    researchPapers: 0.3,
    teachingHours: 0.2,
    studentFeedback: 0.3,
    workshops: 0.1,
    awards: 0.1
  };

  const researchScore = Math.min((profile.papers?.length ?? 0) / 10, 1) * 100;
  const teachingScore = Math.min((profile.hoursTaught ?? 0) / 150, 1) * 100;
  const feedbackScore = Math.min((profile.studentFeedback ?? 0) / 10, 1) * 100;
  const workshopsScore = Math.min((profile.workshops?.length ?? 0) / 5, 1) * 100;
  const awardsScore = Math.min((profile.awards?.length ?? 0) / 3, 1) * 100;

  return (researchScore * weights.researchPapers) +
         (teachingScore * weights.teachingHours) +
         (feedbackScore * weights.studentFeedback) +
         (workshopsScore * weights.workshops) +
         (awardsScore * weights.awards);
};

// Process form arrays correctly
const processFormArrays = (body) => {
  const result = { papers: [], workshops: [], awards: [] };

  // Process papers
  if (body['papers-title']) {
    const titles = Array.isArray(body['papers-title']) ? body['papers-title'] : [body['papers-title']];
    const journals = Array.isArray(body['papers-journal']) ? body['papers-journal'] : [body['papers-journal']];
    const quartiles = Array.isArray(body['papers-quartile']) ? body['papers-quartile'] : [body['papers-quartile']];
    const years = Array.isArray(body['papers-year']) ? body['papers-year'] : [body['papers-year']];

    for (let i = 0; i < titles.length; i++) {
      if (titles[i]?.trim() && journals[i]?.trim()) {
        result.papers.push({
          title: titles[i].trim(),
          journalCorpus: journals[i].trim(),
          quartile: quartiles[i]?.trim() || '',
          year: parseInt(years[i]) || new Date().getFullYear()
        });
      }
    }
  }

  // Process workshops
  if (body['workshops-title']) {
    const titles = Array.isArray(body['workshops-title']) ? body['workshops-title'] : [body['workshops-title']];
    const conductedBy = Array.isArray(body['workshops-conducted']) ? body['workshops-conducted'] : [body['workshops-conducted']];
    const modes = Array.isArray(body['workshops-mode']) ? body['workshops-mode'] : [body['workshops-mode']];

    for (let i = 0; i < titles.length; i++) {
      if (titles[i]?.trim() && conductedBy[i]?.trim()) {
        result.workshops.push({
          title: titles[i].trim(),
          conductedBy: conductedBy[i].trim(),
          mode: modes[i]?.trim() || 'Online'
        });
      }
    }
  }

  // Process awards
  if (body['awards-name']) {
    const names = Array.isArray(body['awards-name']) ? body['awards-name'] : [body['awards-name']];
    const givenBy = Array.isArray(body['awards-by']) ? body['awards-by'] : [body['awards-by']];
    const years = Array.isArray(body['awards-year']) ? body['awards-year'] : [body['awards-year']];

    for (let i = 0; i < names.length; i++) {
      if (names[i]?.trim() && givenBy[i]?.trim()) {
        result.awards.push({
          name: names[i].trim(),
          by: givenBy[i].trim(),
          year: parseInt(years[i]) || new Date().getFullYear()
        });
      }
    }
  }

  return result;
};

// Departments list (for dropdowns & filtering)
const departments = ['SOC', 'SOE', 'ISBJ', 'MITCOM', 'VEDIC-SCIENCE', 'CIVIL SERVICE', 'DESIGN', 'Core'];

// Routes

app.get('/profile/create', (req, res) => {
  res.render('createProfile', { departments });
});

app.post('/profile/create', async (req, res) => {
  try {
    const processedArrays = processFormArrays(req.body);

    // Basic validation example:
    if (!req.body.name || !req.body.designation || !req.body.department || !req.body.domain) {
      return res.status(400).send('Name, designation, department, and domain are required.');
    }

    // Create Teacher document
    const newTeacher = new Teacher({
      name: req.body.name.trim(),
      designation: req.body.designation.trim(),
      department: req.body.department,
      domain: req.body.domain,
      expectedHours: parseInt(req.body.expectedHours) || 20,
      hoursTaught: parseInt(req.body.hoursTaught) || 0,
      studentFeedback: parseFloat(req.body.studentFeedback) || 0,
      papers: processedArrays.papers,
      workshops: processedArrays.workshops,
      awards: processedArrays.awards,
      adminRating: 0,   // default 0
      finalRating: 0    // default 0
    });

    await newTeacher.save();

    // Save paper entries to Google Sheet, or placeholders if none
    if (processedArrays.papers.length === 0) {
      await appendToSheet([
        newTeacher.name,
        newTeacher.designation,
        '', '', ''
      ]);
    } else {
      for (const paper of processedArrays.papers) {
        await appendToSheet([
          newTeacher.name,
          newTeacher.designation,
          paper.title,
          paper.journalCorpus,
          paper.quartile
        ]);
      }
    }

    res.send('Faculty profile saved successfully!');
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).send('Error saving profile: ' + error.message);
  }
});

app.get('/admin/profiles', async (req, res) => {
  try {
    const filterDept = req.query.department;
    const query = filterDept && filterDept !== 'ALL' ? { department: filterDept } : {};
    const profiles = await Teacher.find(query);

    const profilesWithRatings = profiles.map(profile => {
      const autoRating = calculateScore(profile);
      const autoRatingOutOf10 = (autoRating / 10).toFixed(2);

      return {
        ...profile._doc,
        autoRating: autoRatingOutOf10,
        adminRating: profile.adminRating ?? 0,
        finalRating: profile.finalRating ?? 0
      };
    });

    // Departments list for filter (including ALL)
    const filterDepartments = ['ALL', ...departments];

    res.render('adminDashboard', { profiles: profilesWithRatings, departments: filterDepartments, selectedDepartment: filterDept || 'ALL' });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).send('Error fetching profiles');
  }
});

app.post('/admin/rate/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).send('Teacher not found');

    const adminRating = parseFloat(req.body.adminRating);
    if (isNaN(adminRating) || adminRating < 0 || adminRating > 10) {
      return res.status(400).send('Admin rating must be between 0 and 10');
    }

    const autoRating = calculateScore(teacher) / 10;
    const finalRating = (autoRating * 0.7) + (adminRating * 0.3);

    teacher.adminRating = adminRating;
    teacher.finalRating = finalRating.toFixed(2);

    await teacher.save();

    res.redirect('/admin/profiles');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving admin rating.');
  }
});


app.get('/admin/profile/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).send('Teacher not found');

    const autoRating = calculateScore(teacher);
    const autoRatingOutOf10 = (autoRating / 10).toFixed(2);

    // Clean prompt string (remove leading indentation)
    const prompt = dedent(`
      Provide point-wise, constructive feedback for a faculty member in the domain of ${teacher.domain}.

      Faculty profile:
      - Number of research papers: ${teacher.papers.length}
      - Number of workshops: ${teacher.workshops.length}
      - Number of awards: ${teacher.awards.length}
      - Teaching hours: ${teacher.hoursTaught}
      - Student feedback score: ${teacher.studentFeedback}

      The feedback should include:
      1. Areas of improvement in research and publications (e.g., trending subfields to explore).
      2. Suggestions for workshops or conferences relevant to the ${teacher.domain} domain.
      3. Recommendations for awards or grants based on their current achievements.
      4. Latest trends in teaching methods or educational technology tools that can enhance classroom experience.
      5. Use a professional yet encouraging tone.

      Begin the feedback with: "Dear ${teacher.name},"
    `);

    const feedback = await generateFeedback(prompt, teacher.name);

    res.render('previewProfile', {
      teacher,
      autoRating: autoRatingOutOf10,
      adminRating: teacher.adminRating ?? 0,
      finalRating: teacher.finalRating ?? 0,
      feedback, // only cleaned feedback sent to template
    });
  } catch (error) {
    console.error('Error in /admin/profile/:id:', error);
    res.status(500).send('Error loading profile.');
  }
});

app.get('/admin/department-feedbacks', async (req, res) => {
  try {
    const { department } = req.query;

    const feedbacks = department
      ? await DepartmentFeedback.find({ department })
      : [];

    const departments = await Teacher.distinct('department');

    res.render('department-feedbacks', {
      feedbacks,
      departments,
      selectedDept: department || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load department feedbacks.');
  }
});

app.post('/admin/department-feedback/:department', async (req, res) => {
  const { department } = req.params;

  try {
    const teachers = await Teacher.find({ department });
    if (!teachers.length) {
      return res.status(404).json({ message: 'No teachers found in this department.' });
    }

    // Combine profile data
    const profileSummaries = teachers.map(t => {
      return `Name: ${t.name}\nPapers: ${t.papers.length}, Workshops: ${t.workshops.length}, Awards: ${t.awards.length}, Teaching Hours: ${t.hoursTaught}, Feedback: ${t.studentFeedback}`;
    }).join('\n\n');

    const prompt = `
You are an academic reviewer generating a concise and professional feedback report for the "${department}" department, based on faculty achievements.

Faculty Profiles:
${profileSummaries}

Your output must be in the following format and should be clear with real-world on-going trends and links:

---
📘 ${department} Department  
Department Feedback for ${department}

Key Strengths:
- [3 concise points max]

Areas of Improvement:
- [3 concise points max]

Suggested Research & Conference Focus:
- [3 concise points max]

Teaching & Technology Trends:
- [3 concise points max]

Avoid unnecessary asterisks or lengthy explanations. Use a clear, readable tone that is professional and easy to scan.
`.trim();

    const aiFeedback = await generateFeedback(prompt, `Department Feedback for ${department}`);

    // Save feedback to DB
    await DepartmentFeedback.findOneAndUpdate(
      { department },
      { feedback: aiFeedback, generatedAt: new Date() },
      { upsert: true }
    );

    res.status(200).json({ department, feedback: aiFeedback });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate department feedback.' });
  }
});

const getTopKeywords = (list, limit = 5) => {
  const freq = {};
  list.forEach(word => {
    const w = word.trim();
    freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, limit);
};

app.get('/admin/comparison-dashboard', async (req, res) => {
  try {
    const departments = await Teacher.distinct('department');
    const teachers = await Teacher.find();
    const feedbacks = await DepartmentFeedback.find();

    const departmentStats = {};
    let allStrengths = [];
    let allWeaknesses = [];

    for (const dept of departments) {
      const deptTeachers = teachers.filter(t => t.department === dept);
      const deptFeedback = feedbacks.find(f => f.department === dept);

      const papers = deptTeachers.reduce((sum, t) => sum + t.papers.length, 0);
      const workshops = deptTeachers.reduce((sum, t) => sum + t.workshops.length, 0);
      const awards = deptTeachers.reduce((sum, t) => sum + t.awards.length, 0);
      const teaching = deptTeachers.reduce((sum, t) => sum + t.hoursTaught, 0);
      const feedback = deptTeachers.length > 0
        ? deptTeachers.reduce((sum, t) => sum + (t.studentFeedback || 0), 0) / deptTeachers.length
        : 0;

      if (deptFeedback?.feedback) {
        const { strengthKeywords, weaknessKeywords } = extractKeywords(deptFeedback.feedback);
        allStrengths.push(...strengthKeywords);
        allWeaknesses.push(...weaknessKeywords);
      }

      departmentStats[dept] = { papers, workshops, awards, teaching, feedback: feedback.toFixed(2) };
    }

    // Take top 5 most frequent and relevant keywords
    const topStrengths = getTopKeywords(allStrengths, 5);
    const topWeaknesses = getTopKeywords(allWeaknesses, 5);

    res.render('comparisonDashboard', {
      departmentStats,
      strengths: topStrengths,
      weaknesses: topWeaknesses
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

app.post('/admin/profile/:id/delete', async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    res.redirect('/admin/profiles');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting profile.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
