import json
import paramiko

host = '124.222.49.173'
username = 'ubuntu'
password = 'Qmd72h8r1@'
commands = {
    'node': 'bash -lc "command -v node || true; ls -l /root/.nix-profile/bin/node 2>/dev/null || true; ls -l /nix/var/nix/profiles/default/bin/node 2>/dev/null || true"',
    'mongosh': 'bash -lc "command -v mongosh || true; ls -l /root/.nix-profile/bin/mongosh 2>/dev/null || true"',
}
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, password=password, timeout=20)
out = {}
for key, command in commands.items():
    stdin, stdout, stderr = client.exec_command(command, timeout=60)
    out[key] = {'stdout': stdout.read().decode('utf-8', 'ignore'), 'stderr': stderr.read().decode('utf-8', 'ignore')}
client.close()
print(json.dumps(out, ensure_ascii=False, indent=2))
