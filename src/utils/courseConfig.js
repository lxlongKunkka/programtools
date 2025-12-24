export const SUBJECTS_CONFIG = [
  { name: 'C++基础', realSubject: 'C++', minLevel: 1, maxLevel: 2.9 },
  { name: 'C++进阶', realSubject: 'C++' }, // Removed minLevel/maxLevel as it now uses Group matching
  { name: 'C++提高', realSubject: 'C++', minLevel: 5, maxLevel: 999 },
  { name: 'Python', realSubject: 'Python' },
  { name: 'Web', realSubject: 'Web' }
]

export const getRealSubject = (name) => {
  const conf = SUBJECTS_CONFIG.find(s => s.name === name)
  return conf ? conf.realSubject : name
}

export const filterLevels = (levels, subjectName) => {
  const conf = SUBJECTS_CONFIG.find(s => s.name === subjectName)
  
  // If it's a custom group (not in config), we assume it's a group name match
  if (!conf) {
      return levels.filter(l => l.group === subjectName)
  }
  
  return levels.filter(l => {
    // 1. Explicit group match (Highest Priority)
    if (l.group) {
        return l.group === subjectName
    }
    
    // 2. Fallback for levels without group (Legacy)
    
    // Check Subject
    // Default subject is C++ if missing
    const levelSubject = l.subject || 'C++'
    if (levelSubject !== conf.realSubject) {
        return false
    }
    
    // Check Level Range (only if defined in config)
    if (conf.minLevel !== undefined) {
        const max = conf.maxLevel || 999
        if (l.level < conf.minLevel || l.level > max) {
            return false
        }
    }
    
    return true
  })
}
