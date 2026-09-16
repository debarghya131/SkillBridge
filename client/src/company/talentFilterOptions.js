const LOCATIONS = ['Ahmedabad', 'Bengaluru', 'Bhubaneswar', 'Chandigarh', 'Chennai', 'Coimbatore', 'Delhi', 'Gurugram', 'Guwahati', 'Hyderabad', 'Indore', 'Jaipur', 'Kochi', 'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur', 'Noida', 'Patna', 'Pune', 'Ranchi', 'Surat', 'Thiruvananthapuram', 'Visakhapatnam']
const SKILLS = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'C++', 'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'REST APIs', 'Git', 'Docker', 'AWS', 'Flutter', 'React Native', 'Figma', 'UI/UX Design', 'Graphic Design', 'Canva', 'User Research', 'Data Analysis', 'Excel', 'Power BI', 'Tableau', 'Machine Learning', 'Content Writing', 'Content Marketing', 'SEO', 'Social Media Marketing', 'Video Editing', 'Project Management', 'Business Analysis', 'Quality Assurance']

export function talentFilterOptions(kind, saved = []) {
  const values = new Map()
  for (const value of [...saved, ...(kind === 'location' ? LOCATIONS : SKILLS)]) {
    if (typeof value !== 'string' || !value.trim() || value.trim().toLowerCase() === 'all') continue
    const label = value.trim()
    if (!values.has(label.toLowerCase())) values.set(label.toLowerCase(), label)
  }
  return ['All', ...[...values.values()].sort((a, b) => a.localeCompare(b))]
}
