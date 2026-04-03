import json
import paramiko

host = '124.222.49.173'
username = 'ubuntu'
password = 'Qmd72h8r1@'
commands = {
    'identity': 'hostname; whoami; pwd',
    'disk': 'df -h',
    'var_www': 'ls -la /var/www',
    'programtools': 'ls -la /var/www/programtools',
    'mongo_dirs': "find / -maxdepth 3 -type d 2>/dev/null | grep -i mongo || true",
    'mongo_ps': "ps aux | grep mongo | grep -v grep || true",
    'server_dir': 'ls -la /var/www/programtools/server',
    'server_public': 'ls -la /var/www/programtools/server/public',
    'courseware_dirs': "find /var/www/programtools -maxdepth 4 -type d | grep -i courseware || true",
}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, password=password, timeout=20)
out = {}
for key, command in commands.items():
    stdin, stdout, stderr = client.exec_command(command, timeout=60)
    out[key] = {
        'stdout': stdout.read().decode('utf-8', 'ignore'),
        'stderr': stderr.read().decode('utf-8', 'ignore'),
    }
client.close()
print(json.dumps(out, ensure_ascii=False, indent=2))
