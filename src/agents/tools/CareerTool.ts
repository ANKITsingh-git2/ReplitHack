import { Tool } from './Tool';

const CAREER_RESOURCES: Record<string, any> = {
  'software engineer': {
    skills: ['Programming', 'Problem Solving', 'System Design', 'Algorithms'],
    path: 'Computer Science Degree → Internships → Junior Developer → Senior Developer',
    salary: '₹8-25 LPA',
    companies: ['Google', 'Microsoft', 'Amazon', 'Flipkart', 'Zomato'],
    certifications: ['AWS', 'Google Cloud', 'Kubernetes'],
  },
  'data scientist': {
    skills: ['Python', 'Machine Learning', 'Statistics', 'Data Visualization'],
    path: 'Statistics/CS Degree → Data Analyst → Data Scientist → ML Engineer',
    salary: '₹10-30 LPA',
    companies: ['Amazon', 'Microsoft', 'Flipkart', 'Ola', 'Swiggy'],
    certifications: ['TensorFlow', 'PyTorch', 'AWS ML'],
  },
  'product manager': {
    skills: ['Product Strategy', 'User Research', 'Analytics', 'Communication'],
    path: 'Business/Engineering Degree → Associate PM → PM → Senior PM',
    salary: '₹15-40 LPA',
    companies: ['Google', 'Amazon', 'Flipkart', 'Razorpay', 'PhonePe'],
    certifications: ['Product Management', 'Agile', 'Scrum'],
  },
  'marketing': {
    skills: ['Digital Marketing', 'Content Creation', 'Analytics', 'SEO'],
    path: 'Marketing Degree → Marketing Executive → Manager → Director',
    salary: '₹5-20 LPA',
    companies: ['Amazon', 'Flipkart', 'Zomato', 'Swiggy', 'Myntra'],
    certifications: ['Google Ads', 'Facebook Blueprint', 'HubSpot'],
  },
};

export const CareerTool: Tool = {
  name: 'career_guidance',
  description: 'Provides career guidance, skills, career paths, and salary information',
  inputSchema: { career: 'string', query: 'string' },
  async execute(input: any) {
    console.log('Providing career guidance for', input);
    await new Promise((r) => setTimeout(r, 400));
    
    const career = (input.career || input.query || '').toLowerCase();
    const resource = CAREER_RESOURCES[career] || CAREER_RESOURCES['software engineer'];
    
    return {
      ok: true,
      career: career,
      guidance: {
        skills: resource.skills,
        careerPath: resource.path,
        salaryRange: resource.salary,
        topCompanies: resource.companies,
        recommendedCertifications: resource.certifications,
        tips: [
          'Build a strong portfolio',
          'Network with professionals',
          'Stay updated with industry trends',
          'Practice interview questions',
          'Consider internships',
        ],
      },
    };
  },
};

