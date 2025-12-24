export const SUBJECTS_CONFIG = [
  { name: 'C++基础', realSubject: 'C++', minLevel: 1, maxLevel: 2.9 },
  { name: 'C++进阶', realSubject: 'C++', minLevel: 3, maxLevel: 4.9 },
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
  if (!conf) return levels
  
  return levels.filter(l => {
    // 1. Explicit group match (New way)
    if (l.group) {
        return l.group === subjectName
    }
    // 2. Legacy level range match (Old way)
    if (conf.minLevel) {
        return l.level >= conf.minLevel && l.level <= (conf.maxLevel || 999)
    }
    return true
  })
}
