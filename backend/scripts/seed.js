const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1'])
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(' Connected to MongoDB');

  // Clear existing
  await User.deleteMany({});
  await Company.deleteMany({});
  console.log(' Cleared existing data');

  // Admin
  const admin = await User.create({
    name: 'Placement Admin',
    email: process.env.ADMIN_SEED_EMAIL || 'admin@uniplacement.ai',
    password: process.env.ADMIN_SEED_PASSWORD || 'Admin@123456',
    role: 'admin',
  });
  console.log(`👤 Admin created: ${admin.email}`);

  // Sample Students
  const students = await User.insertMany([
    {
      name: 'Shruti Phad',
      email: 'shruti@gmail.com',
      password: await bcrypt.hash('Student@123', 12),
      role: 'student',
      department: 'Computer Science',
      semester: 7,
      cgpa: 8.5,
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Python'],
      isProfileComplete: true,
    },
    {
      name: 'Priya Mehta',
      email: 'priya@student.edu',
      password: await bcrypt.hash('Student@123', 12),
      role: 'student',
      department: 'Information Technology',
      semester: 7,
      cgpa: 9.1,
      skills: ['Java', 'Spring Boot', 'MySQL', 'Docker', 'AWS'],
      isProfileComplete: true,
    },
    {
      name: 'Rahul Verma',
      email: 'rahul@student.edu',
      password: await bcrypt.hash('Student@123', 12),
      role: 'student',
      department: 'Electronics',
      semester: 7,
      cgpa: 7.8,
      skills: ['C++', 'Python', 'Machine Learning', 'TensorFlow'],
      isProfileComplete: true,
    },
  ]);
  console.log(`👥 ${students.length} students created`);

  // Sample Companies
  const companies = await Company.insertMany([
    {
      name: 'Google',
      description: 'Google LLC is an American multinational technology company focusing on AI, online advertising, search engine technology, cloud computing, and software.',
      website: 'https://careers.google.com',
      industry: 'Technology',
      headquarters: 'Mountain View, California',
      driveSchedule: new Date('2025-03-15'),
      driveVenue: 'Main Auditorium, Block A',
      createdBy: admin._id,
      roles: [
        {
          roleTitle: 'Software Development Engineer',
          salaryPackage: '45 LPA',
          jobDescription: 'Design, develop, and maintain high-quality software solutions for Google products. Work on large-scale distributed systems, write clean code, and collaborate with cross-functional teams.',
          responsibilities: [
            'Design and implement scalable backend services',
            'Write unit and integration tests',
            'Participate in code reviews',
            'Collaborate with PMs and designers',
          ],
          requiredSkills: ['Data Structures', 'Algorithms', 'Python', 'Java', 'System Design', 'SQL'],
          interviewRounds: ['Online Assessment', 'Technical Round 1', 'Technical Round 2', 'Hiring Manager Round'],
          openings: 5,
          eligibilityCriteria: {
            minCGPA: 7.5,
            allowedDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
            allowedSemesters: [7, 8],
          },
        },
      ],
      updates: [
        { title: 'Registration Open!', content: 'Google campus drive registrations are now open. Complete your profile to apply.', postedBy: admin._id },
      ],
    },
    {
      name: 'Microsoft',
      description: 'Microsoft Corporation is an American multinational technology corporation producing computer software, consumer electronics, personal computers, and related services.',
      website: 'https://careers.microsoft.com',
      industry: 'Technology',
      headquarters: 'Redmond, Washington',
      driveSchedule: new Date('2025-03-22'),
      driveVenue: 'Seminar Hall, Block C',
      createdBy: admin._id,
      roles: [
        {
          roleTitle: 'Software Engineer',
          salaryPackage: '40 LPA',
          jobDescription: 'Build innovative products and services that empower millions of people. Work with cutting-edge technologies including Azure, AI/ML, and cloud infrastructure.',
          responsibilities: [
            'Develop and ship high-quality software',
            'Mentor junior engineers',
            'Drive technical design decisions',
          ],
          requiredSkills: ['C#', 'Azure', 'JavaScript', 'TypeScript', 'React', 'Algorithms'],
          interviewRounds: ['Coding Test', 'Technical Interview 1', 'Technical Interview 2', 'HR Round'],
          openings: 8,
          eligibilityCriteria: {
            minCGPA: 7.0,
            allowedDepartments: ['Computer Science', 'Information Technology'],
            allowedSemesters: [7, 8],
          },
        },
        {
          roleTitle: 'Data Scientist',
          salaryPackage: '38 LPA',
          jobDescription: 'Apply advanced analytics, machine learning, and statistical modeling to solve real-world business problems at scale.',
          responsibilities: ['Build ML models', 'Analyze large datasets', 'Collaborate with engineering teams'],
          requiredSkills: ['Python', 'Machine Learning', 'SQL', 'TensorFlow', 'Statistics', 'Azure ML'],
          interviewRounds: ['Take-home Assignment', 'Technical Interview', 'Case Study Round'],
          openings: 3,
          eligibilityCriteria: {
            minCGPA: 8.0,
            allowedDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
            allowedSemesters: [7, 8],
          },
        },
      ],
    },
    {
      name: 'Infosys',
      description: 'Infosys Limited is an Indian multinational IT company that provides business consulting, information technology and outsourcing services.',
      website: 'https://www.infosys.com/careers',
      industry: 'IT Services',
      headquarters: 'Bengaluru, India',
      driveSchedule: new Date('2025-02-28'),
      createdBy: admin._id,
      roles: [
        {
          roleTitle: 'Systems Engineer',
          salaryPackage: '6.5 LPA',
          jobDescription: 'Work as a systems engineer to develop, test and maintain enterprise software applications for global clients.',
          responsibilities: ['Code development', 'Unit testing', 'Client communication', 'Documentation'],
          requiredSkills: ['Java', 'SQL', 'Core Java', 'Problem Solving', 'Communication'],
          interviewRounds: ['Online Test', 'Technical Interview', 'HR Interview'],
          openings: 50,
          eligibilityCriteria: {
            minCGPA: 6.0,
            allowedSemesters: [7, 8],
          },
        },
      ],
    },
  ]);
  console.log(` ${companies.length} companies created`);

  console.log('\n Seed completed successfully!');
  console.log(`Admin Email:    ${admin.email}`);
  console.log(`Admin Password: ${process.env.ADMIN_SEED_PASSWORD || 'Admin@123456'}`);
  console.log(`Student Email:  arjun@student.edu`);
  console.log(`Student Pass:   Student@123`);


  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error(' Seed failed:', err);
  process.exit(1);
});