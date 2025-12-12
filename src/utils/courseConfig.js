export const SUBJECTS_CONFIG = [
  { name: 'C++基础', realSubject: 'C++', minLevel: 1, maxLevel: 2 },
  { name: 'C++进阶', realSubject: 'C++', minLevel: 3, maxLevel: 4 },
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
  if (!conf || !conf.minLevel) return levels
  return levels.filter(l => l.level >= conf.minLevel && l.level <= (conf.maxLevel || 999))
}
