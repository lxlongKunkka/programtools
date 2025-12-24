
import http from 'http';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function checkApi() {
  try {
    const groups = await get('/api/course/groups');
    console.log('Groups API:', groups.map(g => g.name));

    const levels = await get('/api/course/levels');
    console.log('Levels API:', levels.map(l => ({ l: l.level, g: l.group })));

  } catch (e) {
    console.error(e);
  }
}

checkApi();
