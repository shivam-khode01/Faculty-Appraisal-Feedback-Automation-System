const mongoose = require('mongoose');
const Teacher = require('./models/Teacher'); // Adjust this path
//const Teacher = mongoose.model('Teacher', teacherSchema);

mongoose.connect('mongodb://localhost:27017/appraisalDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');

  const sampleTeachers = [
  {
    name: 'Dr. Anjali Mehta',
    designation: 'Professor',
    department: 'SOC',
    expectedHours: 160,
    hoursTaught: 155,
    studentFeedback: 4.6,
    papers: [
      { title: 'Urban Development in India', journalCorpus: 'Indian Journal of Sociology', quartile: 'Q1', year: 2023 },
      { title: 'Community Behavior Patterns', journalCorpus: 'Asian Social Science Review', quartile: 'Q2', year: 2022 }
    ],
    workshops: [
      { title: 'Sociological Research Methods', conductedBy: 'Anjali Mehta', mode: 'Offline' },
      { title: 'Community Participation Models', conductedBy: 'Anjali Mehta', mode: 'Online' }
    ],
    awards: [
      { name: 'Best Sociologist Award', by: 'Indian Sociological Society', year: 2022 }
    ],
    domain: 'Core',
    adminRating: 4.7,
    finalRating: 4.65
  },
  {
    name: 'Prof. Ramesh Iyer',
    designation: 'Senior Lecturer',
    department: 'SOE',
    expectedHours: 150,
    hoursTaught: 148,
    studentFeedback: 4.4,
    papers: [
      { title: 'Renewable Energy Trends', journalCorpus: 'Energy India Journal', quartile: 'Q2', year: 2021 }
    ],
    workshops: [
      { title: 'Green Engineering', conductedBy: 'Ramesh Iyer', mode: 'Offline' }
    ],
    awards: [],
    domain: 'AIA',
    adminRating: 4.5,
    finalRating: 4.45
  },
  {
    name: 'Dr. Sneha Raut',
    designation: 'Lecturer',
    department: 'ISBJ',
    expectedHours: 145,
    hoursTaught: 140,
    studentFeedback: 4.8,
    papers: [
      { title: 'Digital Marketing Impact', journalCorpus: 'India Business Review', quartile: 'Q3', year: 2023 },
      { title: 'Startup Ecosystem Analysis', journalCorpus: 'South Asian Business Journal', quartile: 'Q2', year: 2022 }
    ],
    workshops: [],
    awards: [
      { name: 'Young Faculty Award', by: 'Indian Business Society', year: 2023 }
    ],
    domain: 'Big Data',
    adminRating: 4.6,
    finalRating: 4.7
  },
  {
    name: 'Mr. Vikram Sinha',
    designation: 'Assistant Professor',
    department: 'MITCOM',
    expectedHours: 140,
    hoursTaught: 135,
    studentFeedback: 4.1,
    papers: [],
    workshops: [
      { title: 'Cyber Law Basics', conductedBy: 'Vikram Sinha', mode: 'Online' }
    ],
    awards: [
      { name: 'Faculty Excellence', by: 'MITCOM Faculty Council', year: 2021 }
    ],
    domain: 'Cybersecurity',
    adminRating: 4.2,
    finalRating: 4.15
  },
  {
    name: 'Prof. Kavita Menon',
    designation: 'Professor',
    department: 'VEDIC-SCIENCE',
    expectedHours: 170,
    hoursTaught: 165,
    studentFeedback: 4.9,
    papers: [
      { title: 'The Science in Ayurveda', journalCorpus: 'Vedic Wisdom Journal', quartile: 'Q1', year: 2023 },
      { title: 'Healing Practices in Ancient India', journalCorpus: 'Journal of Vedic Sciences', quartile: 'Q2', year: 2022 },
      { title: 'Meditative States and Brainwaves', journalCorpus: 'Indian Psychology Review', quartile: 'Q2', year: 2021 }
    ],
    workshops: [
      { title: 'Ayurveda for Modern Times', conductedBy: 'Kavita Menon', mode: 'Offline' }
    ],
    awards: [
      { name: 'Lifetime Contribution to Vedic Sciences', by: 'Vedic Research Council', year: 2023 },
      { name: 'Excellence in Ancient Studies', by: 'Indian Heritage Trust', year: 2022 }
    ],
    domain: 'AIEC',
    adminRating: 4.9,
    finalRating: 4.85
  },
  {
    name: 'Ms. Nidhi Verma',
    designation: 'Assistant Professor',
    department: 'DESIGN',
    expectedHours: 130,
    hoursTaught: 125,
    studentFeedback: 4.3,
    papers: [
      { title: 'Sustainable Fashion Design', journalCorpus: 'Design India Journal', quartile: 'Q3', year: 2022 }
    ],
    workshops: [
      { title: 'Design Thinking', conductedBy: 'Nidhi Verma', mode: 'Online' },
      { title: 'UI/UX Crash Course', conductedBy: 'Nidhi Verma', mode: 'Offline' }
    ],
    awards: [],
    domain: 'Cloud Computing',
    adminRating: 4.2,
    finalRating: 4.3
  },
  {
    name: 'Dr. Rajesh Khanna',
    designation: 'Professor',
    department: 'SOE',
    expectedHours: 160,
    hoursTaught: 158,
    studentFeedback: 4.6,
    papers: [
      { title: 'Smart Cities and IoT', journalCorpus: 'Technology India Journal', quartile: 'Q1', year: 2022 }
    ],
    workshops: [],
    awards: [
      { name: 'Engineering Excellence Award', by: 'Institution of Engineers India', year: 2022 }
    ],
    domain: 'AIA',
    adminRating: 4.6,
    finalRating: 4.55
  },
  {
    name: 'Dr. Priya Deshpande',
    designation: 'Lecturer',
    department: 'ISBJ',
    expectedHours: 150,
    hoursTaught: 147,
    studentFeedback: 4.4,
    papers: [],
    workshops: [
      { title: 'Data Visualization Basics', conductedBy: 'Priya Deshpande', mode: 'Online' }
    ],
    awards: [],
    domain: 'Big Data',
    adminRating: 4.3,
    finalRating: 4.35
  },
  {
    name: 'Mr. Manish Rawat',
    designation: 'Senior Lecturer',
    department: 'MITCOM',
    expectedHours: 155,
    hoursTaught: 150,
    studentFeedback: 4.2,
    papers: [
      { title: 'Cybersecurity Threats in India', journalCorpus: 'Cyber India', quartile: 'Q2', year: 2023 }
    ],
    workshops: [],
    awards: [],
    domain: 'Cybersecurity',
    adminRating: 4.2,
    finalRating: 4.2
  },
  {
    name: 'Dr. Sahana Krishnan',
    designation: 'Professor',
    department: 'VEDIC-SCIENCE',
    expectedHours: 165,
    hoursTaught: 160,
    studentFeedback: 4.9,
    papers: [
      { title: 'Astrology and Mathematics', journalCorpus: 'Journal of Indic Studies', quartile: 'Q1', year: 2023 }
    ],
    workshops: [
      { title: 'Vedic Mathematics Simplified', conductedBy: 'Sahana Krishnan', mode: 'Online' }
    ],
    awards: [
      { name: 'Vedic Innovation Award', by: 'Bharat Heritage Foundation', year: 2023 }
    ],
    domain: 'AIEC',
    adminRating: 4.85,
    finalRating: 4.9
  }
];



  Teacher.deleteMany({})
    .then(() => {
      console.log('Cleared existing teachers.');
      return Teacher.insertMany(sampleTeachers);
    })
    .then(() => {
      console.log('Sample teachers inserted successfully!');
      mongoose.connection.close();
    })
    .catch(err => {
      console.error('Error inserting sample teachers:', err);
      mongoose.connection.close();
    });

    }).catch(err => {
      console.error('Failed to connect to MongoDB', err);
    });