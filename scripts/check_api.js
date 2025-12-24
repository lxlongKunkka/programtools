
import fetch from 'node-fetch';

async function checkApi() {
  try {
    const groupsRes = await fetch('http://localhost:3000/api/course/groups');
    const groups = await groupsRes.json();
    console.log('Groups API:', groups.map(g => g.name));

    const levelsRes = await fetch('http://localhost:3000/api/course/levels');
    const levels = await levelsRes.json();
    console.log('Levels API:', levels.map(l => ({ l: l.level, g: l.group })));

  } catch (e) {
    console.error(e);
  }
}

checkApi();
